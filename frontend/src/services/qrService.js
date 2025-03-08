import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const qrService = {
  // Get existing QR code for a booking
  getQRCode: async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_URL}/qr/booking/${bookingId}/qr`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Generate QR code for a booking
  generateQRCode: async (bookingId) => {
    try {
      const response = await axios.post(
        `${API_URL}/qr/booking/${bookingId}/generate-qr`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Validate QR code (organization only)
  validateQRCode: async (qrCode, confirm = false) => {
    try {
      const response = await axios.post(
        `${API_URL}/qr/validate`,
        { qrCode, confirmValidation: confirm },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Generate PDF with booking details
  generatePDF: async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_URL}/qr/booking/${bookingId}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          responseType: 'blob'
        }
      );
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default qrService; 