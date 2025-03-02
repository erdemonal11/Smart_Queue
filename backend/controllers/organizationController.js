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
  deleteQueue
}; 