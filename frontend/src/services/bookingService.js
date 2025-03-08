import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/bookings`;

const getAuthHeader = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
});

const bookingService = {
  // Create a new booking
  createBooking: async (bookingData) => {
    try {
      const response = await axios.post(
        `${API_URL}/book`,
        bookingData,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error('Failed to create booking');
    }
  },

  // Cancel a booking
  cancelBooking: async (id) => {
    try {
      const response = await axios.post(
        `${API_URL}/cancel/${id}`,
        {},
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to cancel booking';
    }
  },

  // Get user's bookings
  getUserBookings: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/user`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data.map(booking => ({
        ...booking,
        qr_generated: booking.qr_generated === true
      }));
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get organization's queue
  getOrganizationQueue: async (organizationId, date) => {
    try {
      const response = await axios.get(
        `${API_URL}/organization/${organizationId}/${date}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch queue';
    }
  },

  // Get queue position
  getQueuePosition: async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_URL}/queue-position/${bookingId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch queue position';
    }
  }
};

export default bookingService; 