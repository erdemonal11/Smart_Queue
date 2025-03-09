const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Function to initialize database with required tables
const initDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone_number TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Create admin table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone_number TEXT NOT NULL
      )
    `);

    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        location TEXT,
        working_hours TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Create time_slots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 6,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, start_time, end_time)
      )
    `);

    // Create bookings table with reference to time_slots
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        time_slot_id INTEGER REFERENCES time_slots(id),
        date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Confirmed',
        qr_code TEXT UNIQUE,
        is_valid BOOLEAN DEFAULT false,
        is_checked_in BOOLEAN DEFAULT false,
        qr_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_status CHECK (status IN ('Confirmed', 'Cancelled', 'Completed'))
      )
    `);

    // Create queue table for dynamic queue management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id),
        time_slot_id INTEGER REFERENCES time_slots(id),
        date DATE NOT NULL,
        queue_position INTEGER NOT NULL,
        check_in_attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, time_slot_id, date, queue_position)
      )
    `);

    // Create messages table for communication
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_system_message BOOLEAN DEFAULT FALSE
      )
    `);

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_org_date ON bookings(organization_id, date);
      CREATE INDEX IF NOT EXISTS idx_queue_org_date ON queue(organization_id, date);
      CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_queue_booking ON queue(booking_id);
      CREATE INDEX IF NOT EXISTS idx_timeslots_org ON time_slots(organization_id);
      CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

// Helper functions for queue management
const queueQueries = {
  // Get next available queue position for a time slot
  getNextQueuePosition: async (organizationId, date, timeSlotId) => {
    const result = await pool.query(
      `SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
       FROM queue q
       JOIN bookings b ON q.booking_id = b.id
       WHERE q.organization_id = $1 
       AND q.date = $2 
       AND b.time_slot_id = $3`,
      [organizationId, date, timeSlotId]
    );
    return result.rows[0].next_position;
  },

  // Update queue positions after cancellation
  updateQueuePositions: async (organizationId, date, timeSlotId, canceledPosition) => {
    return pool.query(
      `UPDATE queue q
       SET queue_position = queue_position - 1 
       FROM bookings b
       WHERE q.booking_id = b.id
       AND q.organization_id = $1 
       AND q.date = $2 
       AND b.time_slot_id = $3 
       AND q.queue_position > $4`,
      [organizationId, date, timeSlotId, canceledPosition]
    );
  },

  // Add booking to queue
  addToQueue: async (bookingId, userId, organizationId, date, timeSlotId, queuePosition) => {
    return pool.query(
      `INSERT INTO queue (booking_id, user_id, organization_id, date, time_slot_id, queue_position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [bookingId, userId, organizationId, date, timeSlotId, queuePosition]
    );
  },

  // Remove booking from queue
  removeFromQueue: async (bookingId) => {
    return pool.query(
      `DELETE FROM queue WHERE booking_id = $1 RETURNING *`,
      [bookingId]
    );
  },

  // Get queue status for an organization
  getOrganizationQueue: async (organizationId, date) => {
    return pool.query(
      `SELECT q.*, u.name as user_name, b.status, ts.start_time, ts.end_time
       FROM queue q
       JOIN users u ON q.user_id = u.id
       JOIN bookings b ON q.booking_id = b.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       WHERE q.organization_id = $1 
       AND q.date = $2
       ORDER BY ts.start_time, q.queue_position`,
      [organizationId, date]
    );
  },

  // Get user's position in queue
  getUserQueuePosition: async (userId, bookingId) => {
    return pool.query(
      `SELECT q.*, o.name as organization_name, ts.start_time, ts.end_time
       FROM queue q
       JOIN organizations o ON q.organization_id = o.id
       JOIN bookings b ON q.booking_id = b.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       WHERE q.user_id = $1 AND q.booking_id = $2`,
      [userId, bookingId]
    );
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDatabase,
  queueQueries
}; 