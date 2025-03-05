const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, isAdmin, isOrganization, isOwnOrganization } = require('../middlewares/auth');

// Public routes
router.post('/login', organizationController.loginOrganization);

// Protected routes
router.get('/active', authenticateToken, organizationController.getAllOrganizations);
router.get('/profile/:id', authenticateToken, isOwnOrganization, organizationController.getOrganizationById);
router.put('/profile/:id', authenticateToken, isOwnOrganization, organizationController.updateOrganization);
router.delete('/profile/:id', authenticateToken, isOwnOrganization, organizationController.deleteOrganization);

// Admin only routes
router.post('/', authenticateToken, isAdmin, organizationController.createOrganization);
router.get('/all', authenticateToken, isAdmin, organizationController.getAllOrganizationsAdmin);

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