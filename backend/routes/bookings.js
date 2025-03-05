const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const bookingController = require('../controllers/bookingController');

// Create a new booking
router.post('/book', authenticateToken, bookingController.createBooking);

// Cancel a booking
router.post('/cancel/:bookingId', authenticateToken, bookingController.cancelBooking);

// Get user's bookings
router.get('/user', authenticateToken, bookingController.getUserBookings);

// Get organization's queue for a specific date
router.get('/organization/:organizationId/:date', authenticateToken, bookingController.getOrganizationQueue);

// Get queue position for a specific booking
router.get('/queue-position/:bookingId', authenticateToken, bookingController.getQueuePosition);

module.exports = router; 