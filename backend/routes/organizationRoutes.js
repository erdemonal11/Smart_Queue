const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, isAdmin, isOwnOrganization } = require('../middlewares/auth');

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

module.exports = router; 