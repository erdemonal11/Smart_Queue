const db = require('../db');

const bookingController = {
  // Create a new booking
  createBooking: async (req, res) => {
    const { organizationId, date, timeslotId } = req.body;
    const userId = req.user.id;

    try {
      // Start a transaction
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Get the time slot details
        const timeSlotResult = await client.query(
          'SELECT id, start_time FROM time_slots WHERE id = $1',
          [timeslotId]
        );

        if (timeSlotResult.rows.length === 0) {
          throw new Error('Time slot not found');
        }

        // Check if user already has a booking for this time slot and date
        const existingBooking = await client.query(
          `SELECT COUNT(*) FROM bookings 
           WHERE user_id = $1 
           AND organization_id = $2 
           AND date = $3 
           AND time_slot_id = $4 
           AND status = 'Confirmed'`,
          [userId, organizationId, date, timeslotId]
        );

        if (parseInt(existingBooking.rows[0].count) > 0) {
          throw new Error('You already have a booking for this time slot');
        }

        // Check if slot is available
        const slotCheck = await client.query(
          `SELECT COUNT(*) FROM bookings 
           WHERE organization_id = $1 AND date = $2 AND time_slot_id = $3 AND status = 'Confirmed'`,
          [organizationId, date, timeslotId]
        );

        if (parseInt(slotCheck.rows[0].count) >= 6) {
          throw new Error('Time slot is fully booked');
        }

        // Create booking first
        const bookingResult = await client.query(
          `INSERT INTO bookings (user_id, organization_id, time_slot_id, date, status)
           VALUES ($1, $2, $3, $4, 'Confirmed')
           RETURNING id`,
          [userId, organizationId, timeslotId, date]
        );

        const bookingId = bookingResult.rows[0].id;

        // Get next queue position
        const nextPosition = await client.query(
          `SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
           FROM queue q
           JOIN bookings b ON q.booking_id = b.id
           WHERE q.organization_id = $1 
           AND q.date = $2 
           AND b.time_slot_id = $3`,
          [organizationId, date, timeslotId]
        );

        // Add to queue using the same client for transaction
        await client.query(
          `INSERT INTO queue (booking_id, user_id, organization_id, date, time_slot_id, queue_position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [bookingId, userId, organizationId, date, timeslotId, nextPosition.rows[0].next_position]
        );

        await client.query('COMMIT');
        res.status(201).json({ 
          message: 'Booking created successfully',
          queuePosition: nextPosition.rows[0].next_position
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Cancel a booking
  cancelBooking: async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      // Start a transaction
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Get booking details with organization info
        const bookingResult = await client.query(
          `SELECT b.*, o.id as org_id 
           FROM bookings b
           JOIN organizations o ON b.organization_id = o.id
           WHERE b.id = $1`,
          [bookingId]
        );

        if (bookingResult.rows.length === 0) {
          throw new Error('Booking not found');
        }

        const booking = bookingResult.rows[0];

        // Check authorization
        if (userRole === 'user' && booking.user_id !== userId) {
          throw new Error('Unauthorized to cancel this booking');
        } else if (userRole === 'organization' && booking.org_id !== userId) {
          throw new Error('Unauthorized to cancel this booking');
        }

        // Get queue position before removal
        const queueResult = await client.query(
          `SELECT queue_position, time_slot_id FROM queue WHERE booking_id = $1`,
          [bookingId]
        );

        if (queueResult.rows.length > 0) {
          const { queue_position: canceledPosition, time_slot_id: timeSlotId } = queueResult.rows[0];

          // Remove from queue
          await client.query(
            `DELETE FROM queue WHERE booking_id = $1`,
            [bookingId]
          );

          // Update other queue positions
          await client.query(
            `UPDATE queue q
             SET queue_position = queue_position - 1 
             FROM bookings b
             WHERE q.booking_id = b.id
             AND q.organization_id = $1 
             AND q.date = $2 
             AND b.time_slot_id = $3 
             AND q.queue_position > $4`,
            [booking.organization_id, booking.date, timeSlotId, canceledPosition]
          );
        }

        // Update booking status
        await client.query(
          `UPDATE bookings SET status = 'Cancelled' WHERE id = $1`,
          [bookingId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Booking cancelled successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Get user's bookings
  getUserBookings: async (req, res) => {
    try {
      const result = await db.pool.query(
        `SELECT 
          b.id,
          b.date,
          b.status,
          o.name as organization_name,
          o.location,
          q.queue_position,
          ts.start_time,
          ts.end_time
         FROM bookings b
         JOIN organizations o ON b.organization_id = o.id
         LEFT JOIN queue q ON b.id = q.booking_id
         JOIN time_slots ts ON b.time_slot_id = ts.id
         WHERE b.user_id = $1 AND b.status = 'Confirmed'
         ORDER BY b.date DESC, ts.start_time ASC`,
        [req.user.id]
      );

      // Format the response to include formatted time slots
      const formattedBookings = result.rows.map(booking => ({
        ...booking,
        time_slot: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`
      }));

      res.json(formattedBookings);
    } catch (error) {
      console.error('Error getting user bookings:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Get organization's queue for a specific date
  getOrganizationQueue: async (req, res) => {
    const { organizationId, date } = req.params;

    try {
      const result = await db.query(
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

      // Group bookings by time slot
      const groupedBookings = result.rows.reduce((acc, booking) => {
        const timeSlotKey = `${booking.start_time}-${booking.end_time}`;
        if (!acc[timeSlotKey]) {
          acc[timeSlotKey] = [];
        }
        acc[timeSlotKey].push(booking);
        return acc;
      }, {});

      res.json(groupedBookings);
    } catch (error) {
      console.error('Error getting organization queue:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get queue position for a specific booking
  getQueuePosition: async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.id;

    try {
      const result = await db.queueQueries.getUserQueuePosition(userId, bookingId);
      if (result.rows.length === 0) {
        throw new Error('Queue position not found');
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = bookingController; 