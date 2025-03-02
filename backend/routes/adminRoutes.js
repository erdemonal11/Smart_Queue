const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin, isOwnProfile } = require('../middlewares/auth');

// Public route
router.post('/login', adminController.loginAdmin);

// Protected routes for self-management
router.get('/profile/:id', authenticateToken, isOwnProfile, adminController.getAdminById);
router.put('/profile/:id', authenticateToken, isOwnProfile, adminController.updateAdmin);

// Super admin routes (admin managing other admins)
router.post('/register', authenticateToken, isAdmin, adminController.createAdmin);
router.get('/', authenticateToken, isAdmin, adminController.getAllAdmins);
router.get('/:id', authenticateToken, isAdmin, adminController.getAdminById);
router.put('/:id', authenticateToken, isAdmin, adminController.updateAdmin);
router.delete('/:id', authenticateToken, isAdmin, adminController.deleteAdmin);

module.exports = router; 