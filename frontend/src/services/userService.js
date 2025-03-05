import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/users`;

const getAuthHeader = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
});

const userService = {
  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const response = await axios.get(
        `${API_URL}/profile/${userId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch user profile';
    }
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      const response = await axios.put(
        `${API_URL}/profile/${userId}`,
        profileData,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update user profile';
    }
  },

  // Delete user account
  deleteUser: async (userId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/profile/${userId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete user account';
    }
  }
};

export default userService; 