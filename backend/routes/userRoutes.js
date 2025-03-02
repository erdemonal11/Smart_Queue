const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin, isOwnProfile } = require('../middlewares/auth');

// Public routes
router.post('/register', userController.createUser);
router.post('/login', userController.loginUser);

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