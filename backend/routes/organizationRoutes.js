const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, isAdmin, isOwnOrganization, isOrganization } = require('../middlewares/auth');
const db = require('../db');
const { convertToCSV } = require('../utils/csvConverter');

// Debug middleware
router.use((req, res, next) => {
  console.log('Organization Route:', req.method, req.originalUrl);
  next();
});

// Public routes
router.post('/register', organizationController.createOrganization);
router.post('/login', organizationController.loginOrganization);

// Protected routes that don't use URL parameters
router.get('/active', authenticateToken, organizationController.getAllOrganizations);
router.get('/admin', authenticateToken, isAdmin, organizationController.getAllOrganizationsAdmin);
router.get('/all', authenticateToken, isAdmin, organizationController.getAllOrganizationsAdmin);
router.get('/download', authenticateToken, isOrganization, organizationController.downloadOrganizationData);
router.get('/', authenticateToken, organizationController.getAllOrganizations);

// Protected routes with URL parameters
router.get('/profile/:id', authenticateToken, isOwnOrganization, organizationController.getOrganizationById);
router.put('/profile/:id', authenticateToken, isOwnOrganization, organizationController.updateOrganization);
router.delete('/profile/:id', authenticateToken, isOwnOrganization, organizationController.deleteOrganization);

// Admin routes for organization management
router.post('/', authenticateToken, isAdmin, organizationController.createOrganization);
router.get('/:id', authenticateToken, isAdmin, organizationController.getOrganizationById);
router.put('/:id', authenticateToken, isAdmin, organizationController.updateOrganization);
router.delete('/:id', authenticateToken, isAdmin, organizationController.deleteOrganization);

// Queue management routes
router.get('/:id/queues', authenticateToken, isOwnOrganization, organizationController.getOrganizationQueues);
router.post('/:id/queues', authenticateToken, isOwnOrganization, organizationController.createQueue);
router.put('/:id/queues/:queueId', authenticateToken, isOwnOrganization, organizationController.updateQueue);
router.delete('/:id/queues/:queueId', authenticateToken, isOwnOrganization, organizationController.deleteQueue);

// Time slot management routes
router.get('/:id/timeslots', authenticateToken, isOwnOrganization, organizationController.getOrganizationTimeSlots);
router.post('/:id/timeslots', authenticateToken, isOwnOrganization, organizationController.createTimeSlot);
router.put('/:id/timeslots/:slotId', authenticateToken, isOwnOrganization, organizationController.updateTimeSlot);
router.delete('/:id/timeslots/:slotId', authenticateToken, isOwnOrganization, organizationController.deleteTimeSlot);

// Get available time slots for booking
router.get('/:organizationId/timeslots/:date/available', authenticateToken, organizationController.getAvailableTimeSlots);

module.exports = router; 