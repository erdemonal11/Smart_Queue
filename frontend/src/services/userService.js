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
  },

  downloadUserData: async (userId, format = 'json') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_URL}/download?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': format === 'csv' ? 'text/csv' : 'application/json'
          },
          responseType: format === 'csv' ? 'blob' : 'json'
        }
      );

      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      return true;
    } catch (error) {
      console.error('Error downloading data:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Please log in again.');
      }
      throw error.message || 'Failed to download data';
    }
  }
};

export default userService; 