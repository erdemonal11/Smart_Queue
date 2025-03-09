const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Get all conversations for a user or organization
// This route must come BEFORE the /:bookingId route to prevent parameter confusion
router.get('/conversations', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const conversations = await pool.query(
            `SELECT DISTINCT ON (b.id)
                b.id as booking_id,
                b.date as booking_date,
                COALESCE(ts.start_time || ' - ' || ts.end_time, 'Not scheduled') as time_slot,
                b.status,
                b.is_checked_in,
                b.is_valid,
                CASE 
                    WHEN $1 = b.organization_id THEN u.name
                    ELSE o.name
                END as other_party_name,
                CASE 
                    WHEN $1 = b.organization_id THEN u.id
                    ELSE o.id
                END as other_party_id,
                o.location as organization_location,
                o.name as organization_name,
                u.name as user_name,
                (SELECT message FROM messages 
                 WHERE booking_id = b.id 
                 ORDER BY timestamp DESC 
                 LIMIT 1) as last_message,
                (SELECT timestamp FROM messages 
                 WHERE booking_id = b.id 
                 ORDER BY timestamp DESC 
                 LIMIT 1) as last_message_time,
                EXISTS(SELECT 1 FROM messages WHERE booking_id = b.id) as has_messages,
                (SELECT is_system_message FROM messages 
                 WHERE booking_id = b.id 
                 ORDER BY timestamp DESC 
                 LIMIT 1) as last_message_is_system,
                q.queue_position
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN organizations o ON b.organization_id = o.id
             LEFT JOIN time_slots ts ON b.time_slot_id = ts.id
             LEFT JOIN messages m ON b.id = m.booking_id
             LEFT JOIN queue q ON b.id = q.booking_id
             WHERE b.user_id = $1 OR b.organization_id = $1
             ORDER BY b.id, last_message_time DESC NULLS LAST`,
            [userId]
        );

        // Format the conversations data
        const formattedConversations = conversations.rows.map(conv => ({
            ...conv,
            time_slot: conv.time_slot || 'Not scheduled',
            queue_position: conv.queue_position ? `${conv.queue_position}` : 'Not assigned',
            other_party_name: conv.other_party_name + (conv.queue_position ? ` (${conv.queue_position})` : '')
        }));

        res.json(formattedConversations);

    } catch (error) {
        console.error('Error in /conversations:', error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get messages for a booking
router.get('/:bookingId([0-9]+)', authenticateToken, async (req, res) => {
    const bookingId = parseInt(req.params.bookingId, 10);
    const userId = req.user.id;

    if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
    }

    try {
        // Check if user is part of the booking
        const booking = await pool.query(
            `SELECT * FROM bookings WHERE id = $1 AND (user_id = $2 OR organization_id = $2)`,
            [bookingId, userId]
        );

        if (booking.rows.length === 0) {
            return res.status(403).json({ error: "You are not authorized to view this conversation" });
        }

        // Retrieve messages with sender and receiver details
        const messages = await pool.query(
            `SELECT 
                m.*,
                CASE 
                    WHEN m.sender_id = $2 THEN 'You'
                    WHEN m.sender_id = o.id THEN o.name
                    WHEN m.sender_id = u.id THEN u.name
                    ELSE 'Unknown'
                END as sender_name,
                CASE 
                    WHEN m.receiver_id = $2 THEN 'You'
                    WHEN m.receiver_id = o.id THEN o.name
                    WHEN m.receiver_id = u.id THEN u.name
                    ELSE 'Unknown'
                END as receiver_name
             FROM messages m
             LEFT JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
             LEFT JOIN organizations o ON (m.sender_id = o.id OR m.receiver_id = o.id)
             WHERE m.booking_id = $1 
             ORDER BY m.timestamp ASC`,
            [bookingId, userId]
        );

        res.json(messages.rows);

    } catch (error) {
        console.error('Error in /:bookingId:', error);
        res.status(500).json({ error: "Server error" });
    }
});

// Send a message
router.post('/:bookingId([0-9]+)', authenticateToken, async (req, res) => {
    const bookingId = parseInt(req.params.bookingId, 10);
    const { message } = req.body;
    const senderId = req.user.id;

    if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
    }

    try {
        // Check if there is an active booking
        const booking = await pool.query(
            `SELECT * FROM bookings WHERE id = $1`,
            [bookingId]
        );

        if (booking.rows.length === 0) {
            return res.status(400).json({ error: "Booking not found" });
        }

        const { user_id, organization_id, status } = booking.rows[0];

        // Verify that sender is part of the booking
        if (senderId !== user_id && senderId !== organization_id) {
            return res.status(403).json({ error: "You are not authorized to send messages for this booking" });
        }

        // Determine the receiver
        const receiverId = senderId === user_id ? organization_id : user_id;

        // Insert message into the database
        const newMessage = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, booking_id, message, is_system_message)
             VALUES ($1, $2, $3, $4, false)
             RETURNING *`,
            [senderId, receiverId, bookingId, message]
        );

        res.json(newMessage.rows[0]);

    } catch (error) {
        console.error('Error in POST /:bookingId:', error);
        res.status(500).json({ error: "Server error" });
    }
});

// Delete conversation (all messages) for a booking
router.delete('/conversations/:bookingId([0-9]+)', authenticateToken, async (req, res) => {
    const bookingId = parseInt(req.params.bookingId, 10);
    const userId = req.user.id;

    if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
    }

    try {
        // Check if user is part of the booking
        const booking = await pool.query(
            `SELECT * FROM bookings WHERE id = $1 AND (user_id = $2 OR organization_id = $2)`,
            [bookingId, userId]
        );

        if (booking.rows.length === 0) {
            return res.status(403).json({ error: "You are not authorized to delete this conversation" });
        }

        // Check if the booking is cancelled and last message is a system message
        const lastMessage = await pool.query(
            `SELECT is_system_message 
             FROM messages 
             WHERE booking_id = $1 
             ORDER BY timestamp DESC 
             LIMIT 1`,
            [bookingId]
        );

        if (booking.rows[0].status !== 'Cancelled' || !lastMessage.rows[0]?.is_system_message) {
            return res.status(400).json({ error: "Only cancelled conversations with a system message can be deleted" });
        }

        // Delete all messages for this booking
        await pool.query(
            `DELETE FROM messages WHERE booking_id = $1`,
            [bookingId]
        );

        res.json({ message: "Conversation deleted successfully" });

    } catch (error) {
        console.error('Error in DELETE /conversations/:bookingId:', error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router; 