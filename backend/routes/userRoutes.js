const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin, isOwnProfile } = require('../middlewares/auth');
const db = require('../db');
const { convertToCSV } = require('../utils/csvConverter');

// Public routes
router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);

// Download user data - needs to be before the /:id routes to avoid conflict
router.get('/download', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json' } = req.query;

    // Verify user exists
    const userExists = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Gather all user data
    const userData = {
      profile: (await db.query(
        'SELECT id, name, email, phone_number, is_active FROM users WHERE id = $1',
        [userId]
      )).rows[0],
      
      bookings: (await db.query(`
        SELECT 
          b.id, 
          b.date, 
          b.status, 
          b.is_valid, 
          b.is_checked_in,
          b.qr_generated,
          o.name as organization_name, 
          o.location as organization_location,
          ts.start_time,
          ts.end_time,
          q.queue_position
        FROM bookings b 
        JOIN organizations o ON b.organization_id = o.id 
        JOIN time_slots ts ON b.time_slot_id = ts.id
        LEFT JOIN queue q ON b.id = q.booking_id
        WHERE b.user_id = $1 
        ORDER BY b.date DESC, ts.start_time DESC`,
        [userId]
      )).rows,
      
      messages: (await db.query(`
        SELECT 
          m.id,
          m.message,
          m.timestamp,
          m.is_system_message,
          sender.name as sender_name,
          receiver.name as receiver_name,
          b.id as booking_id
        FROM messages m 
        JOIN users sender ON m.sender_id = sender.id 
        JOIN users receiver ON m.receiver_id = receiver.id 
        JOIN bookings b ON m.booking_id = b.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1 
        ORDER BY m.timestamp DESC`,
        [userId]
      )).rows
    };

    if (format === 'csv') {
      const csvData = convertToCSV(userData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=user-data-${userId}.csv`);
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=user-data-${userId}.json`);
      return res.json(userData);
    }
  } catch (error) {
    console.error('Error downloading user data:', error);
    res.status(500).json({ error: error.message || 'Failed to download user data' });
  }
});

// Protected routes for self-management
router.get('/profile/:id', authenticateToken, isOwnProfile, userController.getUserById);
router.put('/profile/:id', authenticateToken, isOwnProfile, userController.updateUser);
router.delete('/profile/:id', authenticateToken, isOwnProfile, userController.deleteUser);

// Admin routes for user management
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
router.get('/:id', authenticateToken, isAdmin, userController.getUserById);
router.put('/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

module.exports = router; 