const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, isAdmin, isOwnOrganization, isOrganization } = require('../middlewares/auth');
const db = require('../db');
const { convertToCSV } = require('../utils/csvConverter');

// Public routes
router.post('/register', organizationController.createOrganization);
router.post('/login', organizationController.loginOrganization);

// Protected routes for self-management
router.get('/profile/:id', authenticateToken, isOwnOrganization, organizationController.getOrganizationById);
router.put('/profile/:id', authenticateToken, isOwnOrganization, organizationController.updateOrganization);
router.delete('/profile/:id', authenticateToken, isOwnOrganization, organizationController.deleteOrganization);

// Admin routes for organization management
router.get('/admin', authenticateToken, isAdmin, organizationController.getAllOrganizationsAdmin);
// Allow any authenticated user to get all organizations
router.get('/', authenticateToken, organizationController.getAllOrganizations);
router.get('/:id', authenticateToken, isAdmin, organizationController.getOrganizationById);
router.put('/:id', authenticateToken, isAdmin, organizationController.updateOrganization);
router.delete('/:id', authenticateToken, isAdmin, organizationController.deleteOrganization);

// Queue management routes
router.get('/:id/queues', authenticateToken, organizationController.getOrganizationQueues);
router.post('/:id/queues', authenticateToken, isOwnOrganization, organizationController.createQueue);
router.put('/:id/queues/:queueId', authenticateToken, isOwnOrganization, organizationController.updateQueue);
router.delete('/:id/queues/:queueId', authenticateToken, isOwnOrganization, organizationController.deleteQueue);

// Download organization data
router.get('/download', authenticateToken, isOrganization, async (req, res) => {
  try {
    const organizationId = req.user.id;
    const { format = 'json' } = req.query;

    // Verify organization exists
    const orgExists = await db.query(
      'SELECT id FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgExists.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Gather all organization data
    const organizationData = {
      profile: (await db.query(
        'SELECT id, name, email, phone_number, location, working_hours, is_active FROM organizations WHERE id = $1',
        [organizationId]
      )).rows[0],
      
      bookings: (await db.query(`
        SELECT 
          b.id,
          b.date,
          b.status,
          b.is_valid,
          b.is_checked_in,
          b.qr_generated,
          u.name as user_name,
          u.email as user_email,
          u.phone_number as user_phone,
          ts.start_time,
          ts.end_time,
          q.queue_position
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN time_slots ts ON b.time_slot_id = ts.id
        LEFT JOIN queue q ON b.id = q.booking_id
        WHERE b.organization_id = $1
        ORDER BY b.date DESC, ts.start_time DESC`,
        [organizationId]
      )).rows,

      timeSlots: (await db.query(`
        SELECT 
          id,
          start_time,
          end_time,
          capacity,
          is_active
        FROM time_slots
        WHERE organization_id = $1
        ORDER BY start_time`,
        [organizationId]
      )).rows,
      
      messages: (await db.query(`
        SELECT 
          m.id,
          m.message,
          m.timestamp,
          m.is_system_message,
          sender.name as sender_name,
          receiver.name as receiver_name,
          b.id as booking_id,
          u.name as user_name
        FROM messages m
        JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
        JOIN organizations sender ON m.sender_id = sender.id
        JOIN organizations receiver ON m.receiver_id = receiver.id
        JOIN bookings b ON m.booking_id = b.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.timestamp DESC`,
        [organizationId]
      )).rows
    };

    if (format === 'csv') {
      const csvData = convertToCSV(organizationData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=organization-data-${organizationId}.csv`);
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=organization-data-${organizationId}.json`);
      return res.json(organizationData);
    }
  } catch (error) {
    console.error('Error downloading organization data:', error);
    res.status(500).json({ error: error.message || 'Failed to download organization data' });
  }
});

module.exports = router; 