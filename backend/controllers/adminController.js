const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Get all admins (admin only)
const getAllAdmins = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, phone_number FROM admin');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin by ID
const getAdminById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if current admin is requesting their own profile or super admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Not authorized to access this admin profile' });
    }
    
    const result = await db.query(
      'SELECT id, name, email, phone_number FROM admin WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create admin (admin only)
const createAdmin = async (req, res) => {
  const { name, email, password, phone_number } = req.body;
  
  if (!name || !email || !password || !phone_number) {
    return res.status(400).json({ message: 'Name, email, password and phone number are required' });
  }
  
  try {
    // Check if admin already exists
    const adminCheck = await db.query('SELECT * FROM admin WHERE email = $1', [email]);
    if (adminCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin
    const result = await db.query(
      'INSERT INTO admin (name, email, password, phone_number) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone_number',
      [name, email, hashedPassword, phone_number]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find admin
    const result = await db.query('SELECT * FROM admin WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone_number: admin.phone_number
      }
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update admin
const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, password } = req.body;
  
  try {
    // Check if current admin is updating their own profile or super admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Not authorized to update this admin profile' });
    }
    
    // Check if admin exists
    const adminCheck = await db.query('SELECT * FROM admin WHERE id = $1', [id]);
    
    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Prepare update fields
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone_number) updates.phone_number = phone_number;
    
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
      UPDATE admin 
      SET ${setClause} 
      WHERE id = $${fields.length + 1} 
      RETURNING id, name, email, phone_number
    `;
    
    const result = await db.query(query, [...values, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete admin (admin only)
const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Prevent deleting self
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }
    
    const result = await db.query(
      'DELETE FROM admin WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  loginAdmin,
  updateAdmin,
  deleteAdmin
}; 