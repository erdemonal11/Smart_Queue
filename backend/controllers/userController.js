const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, phone_number, is_active FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if the requester has permission to view this user
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Not authorized to access this user profile' });
    }
    
    const result = await db.query(
      'SELECT id, name, email, phone_number, is_active FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create user (register)
const createUser = async (req, res) => {
  const { name, email, password, phone_number } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  
  try {
    // Check if user already exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (name, email, password, phone_number) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone_number, is_active',
      [name, email, hashedPassword, phone_number]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// User login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (user.is_active !== 1) {
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, password, is_active } = req.body;
  
  try {
    // Check if the requester has permission to update this user
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Not authorized to update this user profile' });
    }
    
    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare update fields
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone_number) updates.phone_number = phone_number;
    
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
      UPDATE users 
      SET ${setClause} 
      WHERE id = $${fields.length + 1} 
      RETURNING id, name, email, phone_number, is_active
    `;
    
    const result = await db.query(query, [...values, id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (or deactivate)
const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Only admin can delete/deactivate other users
    // Users can deactivate their own account
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Not authorized to deactivate this user' });
    }
    
    // Instead of deleting, we set is_active to 0
    const result = await db.query(
      'UPDATE users SET is_active = 0 WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  loginUser,
  updateUser,
  deleteUser
}; 