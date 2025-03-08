const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { authenticateToken, isOrganization } = require('../middlewares/auth');

// Get existing QR code for a booking
router.get('/booking/:id/qr', authenticateToken, qrController.getQRCode);

// Generate QR code for a booking
router.post('/booking/:id/generate-qr', authenticateToken, qrController.generateQRCode);

// Validate QR code (organization only)
router.post('/validate', authenticateToken, isOrganization, qrController.validateQRCode);

// Generate PDF with booking details
router.get('/booking/:id/pdf', authenticateToken, qrController.generatePDF);

module.exports = router; 