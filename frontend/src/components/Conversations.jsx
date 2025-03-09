import React, { useState, useEffect } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import messageService from '../services/messageService';
import Messages from './Messages';
import { FaInbox, FaTimes, FaChevronLeft, FaCalendarAlt, FaClock, FaHashtag, FaMapMarkerAlt, FaBuilding, FaUser, FaCircle } from 'react-icons/fa';

const Conversations = ({ currentUserId, userRole }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileMessages, setShowMobileMessages] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await messageService.getConversations();
      // Filter conversations based on booking status and prevent self-messaging for organizations
      const filteredData = data.filter(conv => {
        const isOwnConversation = userRole === 'organization' && conv.other_party_id === currentUserId;
        return !isOwnConversation && (conv.status === 'Confirmed' || (conv.status === 'Cancelled' && conv.has_messages));
      });
      setConversations(filteredData);
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [currentUserId, userRole]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM dd, yyyy') : 'Not scheduled';
    } catch (error) {
      return 'Not scheduled';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      const now = new Date();
      const messageDate = new Date(date);
      
      // If the message is from today, show only time
      if (messageDate.toDateString() === now.toDateString()) {
        return format(date, 'h:mm a');
      }
      
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      return '';
    }
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBooking(bookingId);
    setShowMobileMessages(true);
  };

  const handleBackToList = () => {
    setShowMobileMessages(false);
  };

  const handleDeleteConversation = async (bookingId, e) => {
    e.stopPropagation(); // Prevent conversation selection when clicking delete
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    try {
      await messageService.deleteConversation(bookingId);
      // Refresh conversations list
      fetchConversations();
    } catch (err) {
      setError('Failed to delete conversation');
      setTimeout(() => setError(''), 3000);
    }
  };

  const renderConversationCard = (conversation) => {
    const isSelected = selectedBooking === conversation.booking_id;
    const isCancelled = conversation.status === 'Cancelled';
    const hasUnread = conversation.unread_count > 0;
    
    // Format the booking details for display
    const formattedDate = formatDate(conversation.booking_date);
    const formattedTimeSlot = conversation.time_slot || conversation.booking_time_slot || 'Time not set';
    const queuePosition = conversation.queue_position || conversation.booking_queue_position || 'Not assigned';
    
    // Show user name for organization view, and organization name for user view
    const displayName = userRole === 'organization' 
      ? conversation.user_name 
      : conversation.organization_name;
    
    return (
      <div
        key={conversation.booking_id}
        onClick={() => handleSelectBooking(conversation.booking_id)}
        className={`px-4 py-3 border-b cursor-pointer transition-all duration-200
          hover:bg-gray-50 ${
            isSelected 
              ? 'bg-blue-50 border-l-4 border-l-blue-500' 
              : 'border-l-4 border-l-transparent'
          } ${isCancelled ? 'opacity-75' : ''} relative`}
      >
        {/* Header with name and time */}
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center space-x-2">
            {userRole === 'organization' ? (
              <FaUser className="text-gray-400 text-sm" />
            ) : (
              <FaBuilding className="text-gray-400 text-sm" />
            )}
            <h3 className={`text-sm ${hasUnread ? 'font-bold' : 'font-medium'} text-gray-900`}>
              {displayName}
            </h3>
          </div>
          {conversation.last_message_time && (
            <span className={`text-xs whitespace-nowrap ${hasUnread ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              {formatTime(conversation.last_message_time)}
            </span>
          )}
        </div>

        {/* Booking Details */}
        <div className="flex flex-wrap gap-2 text-xs mb-1.5">
          <div className="flex items-center text-gray-600">
            <FaCalendarAlt className="mr-1 text-gray-400 text-[10px]" />
            {formattedDate}
          </div>
          <div className="flex items-center text-gray-600">
            <FaClock className="mr-1 text-gray-400 text-[10px]" />
            {formattedTimeSlot}
          </div>
          <div className="flex items-center text-gray-600">
            <FaHashtag className="mr-1 text-gray-400 text-[10px]" />
            #{queuePosition}
          </div>
          {conversation.location && (
            <div className="flex items-center text-gray-600">
              <FaMapMarkerAlt className="mr-1 text-gray-400 text-[10px]" />
              <span className="truncate max-w-[150px]">{conversation.location}</span>
            </div>
          )}
        </div>

        {/* Last Message */}
        <div className="mb-1.5">
          <p className={`text-xs ${
            conversation.last_message_is_system 
              ? 'text-orange-600 font-medium' 
              : hasUnread
              ? 'text-gray-900 font-semibold'
              : 'text-gray-600'
          } truncate pr-6`}>
            {conversation.last_message || 'No messages yet'}
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
              ${conversation.status === 'Confirmed'
                ? 'bg-green-100 text-green-800'
                : conversation.status === 'Cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
              }`}
            >
              {conversation.status}
            </span>
            {conversation.is_checked_in && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                Checked In
              </span>
            )}
            {conversation.is_valid && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                Validated
              </span>
            )}
            {conversation.status === 'Cancelled' && conversation.last_message_is_system && (
              <button
                onClick={(e) => handleDeleteConversation(conversation.booking_id, e)}
                className="ml-2 text-red-600 hover:text-red-800 text-xs flex items-center"
              >
                <FaTimes className="mr-1" />
                Delete
              </button>
            )}
          </div>
          {hasUnread && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center justify-center bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full font-bold">
                {conversation.unread_count}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMessagePanel = () => {
    const selectedConversation = conversations.find(c => c.booking_id === selectedBooking);
    
    if (!selectedBooking || !selectedConversation) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-50">
          <FaInbox className="text-5xl mb-4 text-gray-400" />
          <p className="text-lg font-medium">Select a conversation to view messages</p>
          <p className="text-sm mt-2 text-gray-400">
            {userRole === 'organization' 
              ? 'Chat with your customers here'
              : 'Chat with organizations here'}
          </p>
        </div>
      );
    }

    // Format the booking details properly
    const bookingDetails = {
      ...selectedConversation,
      booking_date: selectedConversation.booking_date,
      time_slot: selectedConversation.time_slot || selectedConversation.booking_time_slot,
      queue_position: selectedConversation.queue_position || selectedConversation.booking_queue_position,
      location: selectedConversation.location || selectedConversation.organization_location,
      other_party_name: selectedConversation.other_party_name || selectedConversation.organization_name || selectedConversation.user_name,
      status: selectedConversation.status || selectedConversation.booking_status,
    };

    return (
      <div className="h-full flex flex-col">
        {/* Mobile Back Button */}
        <div className="md:hidden p-4 border-b bg-gray-50">
          <button
            onClick={handleBackToList}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <FaChevronLeft className="mr-2" />
            Back to Messages
          </button>
        </div>
        
        <div className="flex-1">
          <Messages
            bookingId={selectedBooking}
            currentUserId={currentUserId}
            onMessageSent={fetchConversations}
            disabled={bookingDetails.status === 'Cancelled'}
            userRole={userRole}
            booking={bookingDetails}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-white rounded-lg">
      {/* Conversations List - Fixed Width */}
      <div className={`w-full md:w-2/5 lg:w-1/3 border-r flex flex-col ${showMobileMessages ? 'hidden md:flex' : 'flex'}`}>
        {/* Fixed Header */}
        <div className="flex-none px-2 py-1.5 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaInbox className="text-gray-500 text-sm" />
              <h2 className="text-sm font-semibold text-gray-800">Messages</h2>
            </div>
            <div className="flex items-center space-x-2">
              {conversations.some(c => c.unread_count > 0) && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {conversations.reduce((sum, conv) => sum + conv.unread_count, 0)} unread
                </span>
              )}
              <span className="text-xs text-gray-500">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Conversations List */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <style>
            {`
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}
          </style>
          {loading && (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
          {error && (
            <div className="m-2 p-2 text-center text-red-500 bg-red-50 rounded-lg flex items-center justify-between text-sm">
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="p-1 hover:bg-red-100 rounded-full transition-colors duration-200"
              >
                <FaTimes className="text-red-500" />
              </button>
            </div>
          )}
          {conversations.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-4 text-gray-500">
              <FaInbox className="text-2xl mb-2 text-gray-400" />
              <p className="text-center font-medium text-sm">No active conversations</p>
              <p className="text-xs text-gray-400 mt-1">
                {userRole === 'organization' 
                  ? 'Your conversations with customers will appear here'
                  : 'Your conversations with organizations will appear here'}
              </p>
            </div>
          )}
          {conversations.map(renderConversationCard)}
        </div>
      </div>

      {/* Messages Panel - Flexible Width */}
      <div className={`flex-1 flex flex-col min-h-0 ${!showMobileMessages ? 'hidden md:flex' : 'flex'}`}>
        {renderMessagePanel()}
      </div>
    </div>
  );
};

export default Conversations; 