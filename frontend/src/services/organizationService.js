import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/organizations`;

const getAuthHeader = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
});

const organizationService = {
  // Get active organizations
  getActiveOrganizations: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/active`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch organizations';
    }
  },

  // Get organization timeslots
  getTimeslots: async (organizationId, date) => {
    try {
      const response = await axios.get(
        `${API_URL}/${organizationId}/timeslots/${date}/available`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch timeslots';
    }
  },

  // Get organization profile
  getOrganizationProfile: async (organizationId) => {
    try {
      const response = await axios.get(
        `${API_URL}/profile/${organizationId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch organization profile';
    }
  },

  // Update organization profile
  updateOrganizationProfile: async (organizationId, profileData) => {
    try {
      const response = await axios.put(
        `${API_URL}/profile/${organizationId}`,
        profileData,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update organization profile';
    }
  },

  // Deactivate organization account
  deleteOrganization: async (organizationId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/profile/${organizationId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        if (error.response.data?.error?.includes('active bookings')) {
          throw new Error('Cannot deactivate account: You have active bookings. Please cancel or complete all active bookings first.');
        }
        if (error.response.data?.error?.includes('active time slots')) {
          throw new Error('Cannot deactivate account: You have active time slots. Please deactivate all time slots first.');
        }
      }
      throw error.response?.data?.error || 'Failed to deactivate organization account';
    }
  },

  // Get organization's time slots
  getOrganizationTimeSlots: async (organizationId) => {
    try {
      const response = await axios.get(
        `${API_URL}/${organizationId}/timeslots`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Get time slots error:', error.response?.data || error.message);
      throw error.response?.data?.error || error.message || 'Failed to fetch time slots';
    }
  },

  // Create a new time slot
  createTimeSlot: async (organizationId, timeSlotData) => {
    try {
      const response = await axios.post(
        `${API_URL}/${organizationId}/timeslots`,
        timeSlotData,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Create time slot error:', error.response?.data || error.message);
      throw error.response?.data?.error || error.message || 'Failed to create time slot';
    }
  },

  // Delete a time slot
  deleteTimeSlot: async (organizationId, timeSlotId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/${organizationId}/timeslots/${timeSlotId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Delete time slot error:', error.response?.data || error.message);
      if (error.response?.status === 400) {
        throw new Error('Cannot delete time slot with active bookings');
      }
      throw error.response?.data?.error || error.message || 'Failed to delete time slot';
    }
  }
};

export default organizationService; 