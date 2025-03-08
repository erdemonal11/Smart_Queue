const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db');
const PDFDocument = require('pdfkit');

// Generate a unique hash for QR code
const generateQRCodeHash = (bookingId, userId) => {
  // Generate a shorter hash that will ONLY be used in QR code
  return crypto.createHash('sha1')
    .update(`${bookingId}-${userId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 12); // Make it even shorter - just 12 characters
};

// Generate QR code for a booking
const generateQRCode = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if booking exists and belongs to the user
    const { rows } = await pool.query(
      `SELECT b.*, o.name as organization_name, o.location, ts.start_time, ts.end_time, q.queue_position
       FROM bookings b
       JOIN organizations o ON b.organization_id = o.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       LEFT JOIN queue q ON b.id = q.booking_id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'Confirmed'`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or not confirmed' });
    }

    const booking = rows[0];

    if (booking.qr_generated) {
      return res.status(400).json({ message: 'QR code already generated for this booking' });
    }

    // Generate QR code hash - ONLY this will be in QR code
    const qrHash = generateQRCodeHash(id, userId);
    
    // Generate QR code image with ONLY the hash
    const qrCodeImage = await QRCode.toDataURL(qrHash, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Update booking with QR code hash
    await pool.query(
      `UPDATE bookings SET qr_code = $1, qr_generated = true WHERE id = $2`,
      [qrHash, id]
    );

    // Convert text from database to proper UTF-8
    const organizationName = Buffer.from(booking.organization_name).toString('utf8');
    const location = Buffer.from(booking.location).toString('utf8');

    res.json({
      qrCode: qrHash, // Send only the hash
      bookingDetails: {
        organization: organizationName,
        location: location,
        date: new Date(booking.date).toLocaleDateString('tr-TR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`,
        queueNumber: booking.queue_position
      }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
};

// Validate QR code
const validateQRCode = async (req, res) => {
  const { qrCode, confirmValidation } = req.body;
  const organizationId = req.user.id;

  try {
    // Get booking details
    const { rows } = await pool.query(
      `SELECT b.*, q.queue_position, u.name as user_name 
       FROM bookings b
       LEFT JOIN queue q ON b.id = q.booking_id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.qr_code = $1 AND b.organization_id = $2`,
      [qrCode, organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Invalid QR code' });
    }

    const booking = rows[0];

    // Check if already checked in
    if (booking.is_checked_in) {
      return res.status(400).json({ message: 'Already checked in' });
    }

    // If this is just the initial scan (not confirmation)
    if (!confirmValidation) {
      return res.json({
        requireConfirmation: true,
        bookingDetails: {
          id: booking.id,
          userName: booking.user_name,
          queuePosition: booking.queue_position,
          date: new Date(booking.date).toLocaleDateString(),
          status: booking.status,
          qrCode: qrCode  // Add the QR code to the response
        }
      });
    }

    // If confirmation received, update check-in status
    await pool.query(
      `UPDATE bookings SET is_checked_in = true, is_valid = true WHERE id = $1`,
      [booking.id]
    );

    res.json({ 
      message: `Check-in validated successfully!`,
      bookingDetails: {
        id: booking.id,
        userName: booking.user_name,
        queuePosition: booking.queue_position,
        status: 'Validated',
        isCheckedIn: true,
        isValid: true
      }
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({ message: 'Failed to validate QR code' });
  }
};

// Generate PDF with booking details
const generatePDF = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Get booking details
    const { rows } = await pool.query(
      `SELECT b.*, o.name as organization_name, o.location, ts.start_time, ts.end_time, q.queue_position
       FROM bookings b
       JOIN organizations o ON b.organization_id = o.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       LEFT JOIN queue q ON b.id = q.booking_id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = rows[0];

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      lang: 'tr',
      info: {
        Title: 'Booking Confirmation',
        Author: 'SmartQueue',
        Subject: 'Booking Details',
        Keywords: 'booking, confirmation, queue',
        CreationDate: new Date()
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${id}.pdf`);
    doc.pipe(res);

    // Add content to PDF with improved styling
    doc.fontSize(28)
       .fillColor('#000000')
       .text('SmartQueue', { align: 'center' });
    
    doc.moveDown()
       .fontSize(20)
       .fillColor('#333333')
       .text('Booking Confirmation', { align: 'center' });

    doc.moveDown(2);

    // Add a line separator
    doc.moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();

    doc.moveDown();

    // Helper function for consistent text styling
    const addField = (label, value) => {
      doc.fontSize(14)
         .fillColor('#333333')
         .text(label + ': ', { continued: true })
         .fillColor('#000000')
         .text(value);
      doc.moveDown(0.5);
    };

    // Add booking details with proper UTF-8 encoding
    addField('Organization', Buffer.from(booking.organization_name).toString('utf8'));
    addField('Location', Buffer.from(booking.location).toString('utf8'));
    addField('Date', new Date(booking.date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
    addField('Time', `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`);
    addField('Queue Position', `#${booking.queue_position}`);

    doc.moveDown(2);

    // Add another line separator
    doc.moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();

    doc.moveDown(2);

    // Save the current Y position before adding QR code
    const qrStartY = doc.y;

    if (booking.qr_code) {
      // Generate QR code with ONLY the hash
      const qrImage = await QRCode.toDataURL(booking.qr_code, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Center and size the QR code appropriately
      const qrSize = 200;
      const pageWidth = doc.page.width;
      const qrX = (pageWidth - qrSize) / 2;

      // Add QR code
      doc.image(Buffer.from(qrImage.split(',')[1], 'base64'), qrX, qrStartY, {
        width: qrSize,
        height: qrSize
      });

      // Move cursor to after QR code
      doc.y = qrStartY + qrSize + 30;

      // Add footer text with proper spacing AFTER the QR code
      doc.fontSize(12)
         .fillColor('#333333')
         .text('Please show this QR code when checking in.', { align: 'center' });

      doc.moveDown();
      doc.fontSize(10)
         .fillColor('#666666')
         .text('This is an official booking confirmation from SmartQueue.', { align: 'center' });
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

// Get existing QR code
const getQRCode = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check if booking exists and belongs to the user
    const { rows } = await pool.query(
      `SELECT b.*, o.name as organization_name, o.location, ts.start_time, ts.end_time, q.queue_position
       FROM bookings b
       JOIN organizations o ON b.organization_id = o.id
       JOIN time_slots ts ON b.time_slot_id = ts.id
       LEFT JOIN queue q ON b.id = q.booking_id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'Confirmed'`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or not confirmed' });
    }

    const booking = rows[0];

    if (!booking.qr_generated || !booking.qr_code) {
      return res.status(404).json({ message: 'QR code not generated for this booking' });
    }

    // Convert text from database to proper UTF-8
    const organizationName = Buffer.from(booking.organization_name).toString('utf8');
    const location = Buffer.from(booking.location).toString('utf8');

    res.json({
      qrCode: booking.qr_code, // Send only the hash, just like in generateQRCode
      bookingDetails: {
        organization: organizationName,
        location: location,
        date: new Date(booking.date).toLocaleDateString('tr-TR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`,
        queueNumber: booking.queue_position
      }
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({ message: 'Failed to get QR code' });
  }
};

module.exports = {
  generateQRCode,
  validateQRCode,
  generatePDF,
  getQRCode
}; 