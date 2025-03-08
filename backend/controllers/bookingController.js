const db = require('../db');

const bookingController = {
  // Create a new booking
  createBooking: async (req, res) => {
    const { organizationId, date, timeslotId } = req.body;
    const userId = req.user.id;

    try {
      // Start a transaction
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Get the time slot details
        const timeSlotResult = await client.query(
          'SELECT id, start_time FROM time_slots WHERE id = $1',
          [timeslotId]
        );

        if (timeSlotResult.rows.length === 0) {
          throw new Error('Time slot not found');
        }

        // Check if user already has a booking for this time slot and date
        const existingBooking = await client.query(
          `SELECT COUNT(*) FROM bookings 
           WHERE user_id = $1 
           AND organization_id = $2 
           AND date = $3 
           AND time_slot_id = $4 
           AND status = 'Confirmed'`,
          [userId, organizationId, date, timeslotId]
        );

        if (parseInt(existingBooking.rows[0].count) > 0) {
          throw new Error('You already have a booking for this time slot');
        }

        // Check if slot is available
        const slotCheck = await client.query(
          `SELECT COUNT(*) FROM bookings 
           WHERE organization_id = $1 AND date = $2 AND time_slot_id = $3 AND status = 'Confirmed'`,
          [organizationId, date, timeslotId]
        );

        if (parseInt(slotCheck.rows[0].count) >= 6) {
          throw new Error('Time slot is fully booked');
        }

        // Create booking first
        const bookingResult = await client.query(
          `INSERT INTO bookings (user_id, organization_id, time_slot_id, date, status)
           VALUES ($1, $2, $3, $4, 'Confirmed')
           RETURNING id`,
          [userId, organizationId, timeslotId, date]
        );

        const bookingId = bookingResult.rows[0].id;

        // Get next queue position
        const nextPosition = await client.query(
          `SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position 
           FROM queue q
           JOIN bookings b ON q.booking_id = b.id
           WHERE q.organization_id = $1 
           AND q.date = $2 
           AND b.time_slot_id = $3`,
          [organizationId, date, timeslotId]
        );

        // Add to queue using the same client for transaction
        await client.query(
          `INSERT INTO queue (booking_id, user_id, organization_id, date, time_slot_id, queue_position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [bookingId, userId, organizationId, date, timeslotId, nextPosition.rows[0].next_position]
        );

        await client.query('COMMIT');
        res.status(201).json({ 
          message: 'Booking created successfully',
          queuePosition: nextPosition.rows[0].next_position
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Cancel a booking
  cancelBooking: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
      // Begin transaction
      await db.query('BEGIN');

      try {
        // First check if the booking exists at all
        const bookingCheck = await db.query(
          'SELECT id, status, organization_id FROM bookings WHERE id = $1',
          [id]
        );

        if (bookingCheck.rows.length === 0) {
          throw new Error('Booking does not exist');
        }

        if (bookingCheck.rows[0].status === 'Cancelled') {
          throw new Error('Booking is already cancelled');
        }

        // Now check authorization and get queue details
        const { rows } = await db.query(
          `SELECT b.*, q.id as queue_id, q.queue_position, q.date, b.time_slot_id, b.organization_id,
                  b.is_checked_in, b.is_valid
           FROM bookings b
           LEFT JOIN queue q ON b.id = q.booking_id
           WHERE b.id = $1`,
          [id]
        );

        const booking = rows[0];

        // Check authorization based on role
        if (userRole === 'organization') {
          // Organizations can only cancel bookings for their own time slots
          if (booking.organization_id !== userId) {
            throw new Error('You are not authorized to cancel bookings for other organizations');
          }
        } else {
          // Regular users can only cancel their own bookings
          if (booking.user_id !== userId) {
            throw new Error('You are not authorized to cancel this booking');
          }
        }

        // Check if booking is already validated or checked in
        if (booking.is_valid || booking.is_checked_in) {
          throw new Error('Cannot cancel booking after validation or check-in');
        }

        // If booking has a queue position, update other queue positions
        if (booking.queue_position) {
          // First, get all affected queue entries ordered by position
          const affectedQueues = await db.query(
            `SELECT id, queue_position 
             FROM queue 
             WHERE date = $1 
             AND time_slot_id = $2 
             AND organization_id = $3 
             AND queue_position > $4
             ORDER BY queue_position ASC`,
            [booking.date, booking.time_slot_id, booking.organization_id, booking.queue_position]
          );

          // Delete the queue entry for this booking first
          if (booking.queue_id) {
            await db.query('DELETE FROM queue WHERE id = $1', [booking.queue_id]);
          }

          // Update each affected queue entry one by one
          for (const queue of affectedQueues.rows) {
            await db.query(
              `UPDATE queue 
               SET queue_position = $1 
               WHERE id = $2`,
              [queue.queue_position - 1, queue.id]
            );
          }
        }

        // Update booking status to Cancelled instead of deleting
        await db.query(
          `UPDATE bookings 
           SET status = 'Cancelled' 
           WHERE id = $1`,
          [id]
        );

        // Commit transaction
        await db.query('COMMIT');

        res.json({ message: 'Booking cancelled successfully' });
      } catch (err) {
        // Rollback in case of error
        await db.query('ROLLBACK');
        throw err;
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(error.message.includes('not authorized') ? 403 : 400).json({ 
        message: error.message || 'Failed to cancel booking' 
      });
    }
  },

  // Get user's bookings
  getUserBookings: async (req, res) => {
    try {
      const result = await db.pool.query(
        `SELECT 
          b.id,
          b.date,
          b.status,
          b.is_valid,
          b.is_checked_in,
          b.qr_generated,
          o.name as organization_name,
          o.location,
          q.queue_position,
          ts.start_time,
          ts.end_time
         FROM bookings b
         JOIN organizations o ON b.organization_id = o.id
         LEFT JOIN queue q ON b.id = q.booking_id
         JOIN time_slots ts ON b.time_slot_id = ts.id
         WHERE b.user_id = $1 AND b.status = 'Confirmed'
         ORDER BY b.date DESC, ts.start_time ASC`,
        [req.user.id]
      );

      // Format the response to include formatted time slots
      const formattedBookings = result.rows.map(booking => ({
        ...booking,
        time_slot: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`
      }));

      res.json(formattedBookings);
    } catch (error) {
      console.error('Error getting user bookings:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Get organization's queue for a specific date
  getOrganizationQueue: async (req, res) => {
    const { organizationId, date } = req.params;

    try {
      const result = await db.query(
        `SELECT q.*, u.name as user_name, b.status, b.is_valid, b.is_checked_in, ts.start_time, ts.end_time
         FROM queue q
         JOIN users u ON q.user_id = u.id
         JOIN bookings b ON q.booking_id = b.id
         JOIN time_slots ts ON b.time_slot_id = ts.id
         WHERE q.organization_id = $1 
         AND q.date = $2
         ORDER BY ts.start_time, q.queue_position`,
        [organizationId, date]
      );

      // Group bookings by time slot
      const groupedBookings = result.rows.reduce((acc, booking) => {
        const timeSlotKey = `${booking.start_time}-${booking.end_time}`;
        if (!acc[timeSlotKey]) {
          acc[timeSlotKey] = [];
        }
        acc[timeSlotKey].push(booking);
        return acc;
      }, {});

      res.json(groupedBookings);
    } catch (error) {
      console.error('Error getting organization queue:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get queue position for a specific booking
  getQueuePosition: async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.id;

    try {
      const result = await db.queueQueries.getUserQueuePosition(userId, bookingId);
      if (result.rows.length === 0) {
        throw new Error('Queue position not found');
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = bookingController; 