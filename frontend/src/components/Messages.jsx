import React, { useState, useEffect, useRef } from 'react';
import messageService from '../services/messageService';
import { format, isValid, parseISO } from 'date-fns';
import { FaPaperPlane, FaSpinner, FaExclamationCircle, FaInfoCircle, FaCheck, FaCheckDouble, FaCalendarAlt, FaClock, FaHashtag, FaMapMarkerAlt } from 'react-icons/fa';

const Messages = ({ bookingId, currentUserId, disabled, onMessageSent, userRole, booking }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatMessageTime = (dateString) => {
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
      
      // If the message is from this year, show month, day and time
      if (messageDate.getFullYear() === now.getFullYear()) {
        return format(date, 'MMM d, h:mm a');
      }
      
      // For older messages, include the year
      return format(date, 'MMM d, yyyy, h:mm a');
    } catch (error) {
      return '';
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const fetchedMessages = await messageService.getMessages(bookingId);
      
      // Remove duplicate messages and sort by timestamp
      const uniqueMessages = fetchedMessages
        .filter((message, index, self) =>
          index === self.findIndex((m) => m.id === message.id)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setMessages(uniqueMessages);
      scrollToBottom();
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await messageService.sendMessage(bookingId, newMessage.trim());
      setNewMessage('');
      await fetchMessages();
      if (onMessageSent) onMessageSent();
    } catch (err) {
      setError('Failed to send message');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message, index) => {
    const isCurrentUser = message.sender_id === currentUserId;
    const isSystemMessage = message.is_system_message;
    const showDateHeader = index === 0 || 
      !isSameDay(parseISO(messages[index - 1].timestamp), parseISO(message.timestamp));

    if (showDateHeader) {
      return (
        <React.Fragment key={`date-${message.id}`}>
          <div className="flex justify-center my-2">
            <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
              {format(parseISO(message.timestamp), 'MMMM d, yyyy')}
            </div>
          </div>
          {renderMessageContent(message, isCurrentUser, isSystemMessage)}
        </React.Fragment>
      );
    }

    return renderMessageContent(message, isCurrentUser, isSystemMessage);
  };

  const renderMessageContent = (message, isCurrentUser, isSystemMessage) => {
    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-orange-50 text-orange-800 px-3 py-1.5 rounded-lg max-w-[90%] text-center">
            <div className="flex items-center justify-center">
              <FaExclamationCircle className="mr-1.5 text-xs" />
              <span className="font-medium text-xs">System Message</span>
            </div>
            <p className="text-xs mt-0.5">{message.message}</p>
            <div className="text-[10px] mt-0.5 text-orange-600">
              {formatMessageTime(message.timestamp)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1.5 group`}
      >
        <div
          className={`max-w-[85%] md:max-w-[70%] rounded-lg px-2.5 py-1.5 shadow-sm
            ${isCurrentUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${isCurrentUser ? 'text-blue-100' : 'text-gray-600'}`}>
              {isCurrentUser 
                ? 'You' 
                : userRole === 'organization' 
                  ? booking.user_name 
                  : booking.organization_name}
            </span>
            <div className="flex items-center space-x-1">
              <span className={`text-[10px] ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                {formatMessageTime(message.timestamp)}
              </span>
              {isCurrentUser && (
                <span className="text-[10px]">
                  {message.is_read ? (
                    <FaCheckDouble className="text-green-300" />
                  ) : (
                    <FaCheck className="text-blue-200" />
                  )}
                </span>
              )}
            </div>
          </div>
          <p className="break-words text-xs mt-0.5">{message.message}</p>
        </div>
      </div>
    );
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const renderBookingDetails = () => {
    if (!booking) return null;
    
    const formatBookingDate = (dateString) => {
      if (!dateString) return 'Not scheduled';
      try {
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'MMM dd, yyyy') : 'Not scheduled';
      } catch (error) {
        return 'Not scheduled';
      }
    };

    return (
      <div className="bg-white px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {userRole === 'organization' ? booking.user_name : booking.organization_name}
            </h3>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
              booking.status === 'Confirmed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {booking.status}
            </span>
          </div>
          {booking.is_checked_in && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-800">
              Checked In
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center text-gray-600">
            <FaCalendarAlt className="mr-1 text-gray-400 text-[10px]" />
            <span>{formatBookingDate(booking.booking_date)}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FaClock className="mr-1 text-gray-400 text-[10px]" />
            <span>{booking.time_slot || 'Time not set'}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FaHashtag className="mr-1 text-gray-400 text-[10px]" />
            <span>Queue #{booking.queue_position || 'Not assigned'}</span>
          </div>
          {booking.location && (
            <div className="flex items-center text-gray-600">
              <FaMapMarkerAlt className="mr-1 text-gray-400 text-[10px]" />
              <span className="truncate max-w-[200px]">{booking.location}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full w-full bg-white">
      {/* Absolutely positioned fixed header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b">
        <div className="px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {userRole === 'organization' ? booking.user_name : booking.organization_name}
              </h3>
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                booking.status === 'Confirmed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {booking.status}
              </span>
            </div>
            {booking.is_checked_in && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                Checked In
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Messages Area - with padding to account for fixed header and footer */}
      <div className="absolute top-[35px] bottom-[35px] left-0 right-0 bg-gray-50 overflow-y-auto"
           ref={messageContainerRef}
           style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 #F1F5F9' }}>
        <div className="p-1.5">
          {loading && messages.length === 0 ? (
            <div className="flex justify-center items-center py-1">
              <FaSpinner className="animate-spin text-gray-500 text-lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2">
              <FaInfoCircle className="text-lg mb-1 text-gray-400" />
              <p className="text-center font-medium text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {userRole === 'organization' 
                  ? 'Start the conversation with your customer'
                  : 'Start the conversation with the organization'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Absolutely positioned fixed footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t">
        {error && (
          <div className="px-2 py-0.5 text-center text-red-500 bg-red-50 text-xs border-b">
            {error}
          </div>
        )}

        {disabled ? (
          <div className="px-2 py-0.5 text-center text-gray-500 bg-gray-50 text-xs">
            <FaExclamationCircle className="inline-block mr-1" />
            This conversation is no longer active
          </div>
        ) : (
          <div className="p-1">
            <form onSubmit={handleSendMessage} className="flex space-x-1.5">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-2 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                disabled={sending || disabled}
              />
              <button
                type="submit"
                className={`px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                  flex items-center justify-center min-w-[50px] text-xs`}
                disabled={sending || disabled || !newMessage.trim()}
              >
                {sending ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <>
                    <FaPaperPlane className="mr-1" />
                    Send
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 