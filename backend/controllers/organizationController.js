const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Get all organizations (accessible to authenticated users)
const getAllOrganizations = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, phone_number, location, working_hours, is_active FROM organizations WHERE is_active = 1'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get organization by ID
const getOrganizationById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT id, name, email, phone_number, location, working_hours, is_active FROM organizations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create organization (admin only)
const createOrganization = async (req, res) => {
  const { name, email, password, phone_number, location, working_hours } = req.body;
  
  if (!name || !email || !password || !phone_number) {
    return res.status(400).json({ 
      message: 'Name, email, password, and phone number are required' 
    });
  }
  
  try {
    // Check if organization already exists
    const orgCheck = await db.query('SELECT * FROM organizations WHERE email = $1', [email]);
    if (orgCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Organization with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create organization with default working hours if not provided
    const defaultWorkingHours = working_hours || 'Not specified';
    
    // Create organization
    const result = await db.query(
      'INSERT INTO organizations (name, email, password, phone_number, location, working_hours) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone_number, location, working_hours, is_active',
      [name, email, hashedPassword, phone_number, location, defaultWorkingHours]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Organization login
const loginOrganization = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find organization
    const result = await db.query('SELECT * FROM organizations WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const organization = result.rows[0];
    
    // Check if organization is active
    if (organization.is_active !== 1) {
      return res.status(401).json({ message: 'Organization account is inactive' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, organization.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: organization.id, email: organization.email, role: 'organization' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      token,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone_number: organization.phone_number,
        location: organization.location,
        working_hours: organization.working_hours
      }
    });
  } catch (error) {
    console.error('Error logging in organization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update organization
const updateOrganization = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, location, working_hours, password, is_active } = req.body;
  
  try {
    // Check if the requester has permission to update this organization
    if (req.user.role !== 'admin' && 
        (req.user.role !== 'organization' || req.user.id !== parseInt(id))) {
      return res.status(403).json({ message: 'Not authorized to update this organization' });
    }
    
    // Check if organization exists
    const orgCheck = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Prepare update fields
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone_number) updates.phone_number = phone_number;
    if (location) updates.location = location;
    if (working_hours) updates.working_hours = working_hours;
    
    // Only admin can change active status
    if (is_active !== undefined && req.user.role === 'admin') {
      updates.is_active = is_active;
    }
    
    // Handle password update separately if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }
    
    // Construct the query dynamically
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field]);
    
    const query = `
      UPDATE organizations 
      SET ${setClause} 
      WHERE id = $${fields.length + 1} 
      RETURNING id, name, email, phone_number, location, working_hours, is_active
    `;
    
    const result = await db.query(query, [...values, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete organization (or deactivate) - admin only
const deleteOrganization = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Instead of deleting, we set is_active to 0
    const result = await db.query(
      'UPDATE organizations SET is_active = 0 WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    res.json({ message: 'Organization deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all organizations (admin only - includes inactive organizations)
const getAllOrganizationsAdmin = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, phone_number, location, working_hours, is_active FROM organizations'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Queue Management Functions
const getOrganizationQueues = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM queues WHERE organization_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createQueue = async (req, res) => {
  const { id } = req.params;
  const { name, description, max_size } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO queues (name, description, max_size, organization_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, max_size, id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateQueue = async (req, res) => {
  const { id, queueId } = req.params;
  const { name, description, max_size, is_active } = req.body;
  
  try {
    const result = await db.query(
      'UPDATE queues SET name = $1, description = $2, max_size = $3, is_active = $4 WHERE id = $5 AND organization_id = $6 RETURNING *',
      [name, description, max_size, is_active, queueId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Queue not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteQueue = async (req, res) => {
  const { id, queueId } = req.params;
  
  try {
    const result = await db.query(
      'DELETE FROM queues WHERE id = $1 AND organization_id = $2 RETURNING id',
      [queueId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Queue not found' });
    }
    
    res.json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error('Error deleting queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get organization's time slots for a specific date
const getTimeslots = async (req, res) => {
  const { organizationId, date } = req.params;

  try {
    // Get organization's working hours
    const orgResult = await db.query(
      'SELECT working_hours FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const workingHours = orgResult.rows[0].working_hours;
    const [start, end] = workingHours.split('-');
    
    // Generate time slots every 30 minutes within working hours
    const slots = [];
    let currentTime = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    while (currentTime < endTime) {
      slots.push({
        id: currentTime.toTimeString().slice(0, 8), // HH:MM:SS format
        time: currentTime.toTimeString().slice(0, 8)
      });
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    // Get booked slots
    const bookedResult = await db.query(
      `SELECT time_slot, COUNT(*) as count
       FROM bookings 
       WHERE organization_id = $1 
       AND date = $2 
       AND status = 'Confirmed'
       GROUP BY time_slot`,
      [organizationId, date]
    );

    // Filter out fully booked slots (6 or more bookings)
    const availableSlots = slots.filter(slot => {
      const bookedSlot = bookedResult.rows.find(
        row => row.time_slot === slot.time
      );
      return !bookedSlot || parseInt(bookedSlot.count) < 6;
    });

    res.json(availableSlots);
  } catch (error) {
    console.error('Error getting time slots:', error);
    res.status(500).json({ error: 'Failed to get time slots' });
  }
};

// Time slot management functions
const createTimeSlot = async (req, res) => {
  const { id } = req.params; // organization id
  const { start_time, end_time, capacity } = req.body;

  try {
    // Validate input
    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'Start time and end time are required' });
    }

    // Validate capacity
    const slot_capacity = capacity || 6; // Default to 6 if not specified
    if (slot_capacity < 1) {
      return res.status(400).json({ error: 'Capacity must be at least 1' });
    }

    // Check if time slot already exists
    const existingSlot = await db.query(
      'SELECT * FROM time_slots WHERE organization_id = $1 AND start_time = $2 AND end_time = $3',
      [id, start_time, end_time]
    );

    if (existingSlot.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot already exists' });
    }

    // Create new time slot
    const result = await db.query(
      `INSERT INTO time_slots (organization_id, start_time, end_time, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, start_time, end_time, slot_capacity]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating time slot:', error);
    res.status(500).json({ error: 'Failed to create time slot' });
  }
};

const updateTimeSlot = async (req, res) => {
  const { id, slotId } = req.params;
  const { start_time, end_time, capacity, is_active } = req.body;

  try {
    // Check if time slot exists and belongs to organization
    const slotCheck = await db.query(
      'SELECT * FROM time_slots WHERE id = $1 AND organization_id = $2',
      [slotId, id]
    );

    if (slotCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    // Prepare update fields
    const updates = {};
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (capacity) updates.capacity = capacity;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    // Construct update query
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field]);

    const query = `
      UPDATE time_slots 
      SET ${setClause} 
      WHERE id = $${fields.length + 1} AND organization_id = $${fields.length + 2}
      RETURNING *
    `;

    const result = await db.query(query, [...values, slotId, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating time slot:', error);
    res.status(500).json({ error: 'Failed to update time slot' });
  }
};

const deleteTimeSlot = async (req, res) => {
  const { id, slotId } = req.params;

  try {
    // Check if there are any active bookings for this time slot
    const bookingCheck = await db.query(
      `SELECT COUNT(*) FROM bookings 
       WHERE organization_id = $2 AND time_slot_id = $1 AND status = 'Confirmed'`,
      [slotId, id]
    );

    if (parseInt(bookingCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete time slot with active bookings. Please cancel all bookings first.' 
      });
    }

    // Delete the time slot
    const result = await db.query(
      'DELETE FROM time_slots WHERE id = $1 AND organization_id = $2 RETURNING *',
      [slotId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    res.json({ message: 'Time slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({ error: 'Failed to delete time slot' });
  }
};

const getOrganizationTimeSlots = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM time_slots 
       WHERE organization_id = $1 
       ORDER BY start_time`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
};

// Get available time slots for a specific date
const getAvailableTimeSlots = async (req, res) => {
  const { organizationId, date } = req.params;

  try {
    // Get all active time slots for the organization with booking counts
    const result = await db.query(
      `SELECT ts.id, ts.start_time, ts.end_time, ts.capacity, ts.is_active,
              COUNT(b.id) as booking_count
       FROM time_slots ts
       LEFT JOIN bookings b ON 
         b.organization_id = ts.organization_id AND 
         b.date = $2 AND 
         b.time_slot_id = ts.id AND
         b.status = 'Confirmed'
       WHERE ts.organization_id = $1 
       AND ts.is_active = true
       GROUP BY ts.id, ts.start_time, ts.end_time, ts.capacity, ts.is_active
       ORDER BY ts.start_time`,
      [organizationId, date]
    );

    // Format the response
    const availableSlots = result.rows.map(slot => ({
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      available_spots: slot.capacity - parseInt(slot.booking_count || 0),
      is_full: parseInt(slot.booking_count || 0) >= slot.capacity
    }));

    res.json(availableSlots);
  } catch (error) {
    console.error('Error getting available time slots:', error);
    res.status(500).json({ error: 'Failed to get available time slots' });
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  loginOrganization,
  updateOrganization,
  deleteOrganization,
  getAllOrganizationsAdmin,
  getOrganizationQueues,
  createQueue,
  updateQueue,
  deleteQueue,
  getTimeslots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  getOrganizationTimeSlots,
  getAvailableTimeSlots
}; 