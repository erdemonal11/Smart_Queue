import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

const messageService = {
  // Send a message
  sendMessage: async (bookingId, message) => {
    try {
      const response = await axios.post(`${BASE_URL}/messages/${bookingId}`, 
        { message },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a booking
  getMessages: async (bookingId) => {
    try {
      const response = await axios.get(`${BASE_URL}/messages/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },

  // Get all conversations
  getConversations: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Format the conversations data
      return response.data.map(conv => ({
        ...conv,
        booking_date: conv.booking_date,
        time_slot: conv.time_slot || 'Not scheduled',
        queue_position: conv.queue_position || 'Not assigned',
        location: conv.organization_location,
        other_party_name: conv.organization_name || conv.user_name || 'Unknown',
        status: conv.status || 'Unknown',
        is_checked_in: conv.is_checked_in || false,
        is_valid: conv.is_valid || false,
        unread_count: parseInt(conv.unread_count) || 0,
        has_messages: conv.has_messages || false,
        last_message_is_system: conv.last_message_is_system || false
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Delete a conversation
  deleteConversation: async (bookingId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/messages/conversations/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};

export default messageService; 