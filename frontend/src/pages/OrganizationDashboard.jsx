import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaBuilding, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash, FaTrash, FaClock, FaSpinner, FaCalendar, FaQrcode, FaExclamationTriangle, FaComments, FaInfoCircle, FaPlus, FaExclamationCircle, FaDownload, FaFileAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import bookingService from '../services/bookingService';
import organizationService from '../services/organizationService';
import QRScanner from '../components/QRScanner';
import Conversations from '../components/Conversations';

// Function to decode JWT token
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
};

const OrganizationDashboard = () => {
  const { user, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    location: '',
    working_hours: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordError, setShowPasswordError] = useState('');
  const [workingHoursError, setWorkingHoursError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [queueData, setQueueData] = useState([]);
  const [queueError, setQueueError] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [newTimeSlot, setNewTimeSlot] = useState({
    start_time: '',
    end_time: '',
    capacity: '6'
  });
  const [timeSlotError, setTimeSlotError] = useState('');
  const [isCreatingTimeSlot, setIsCreatingTimeSlot] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [refreshQueue, setRefreshQueue] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasActiveBookings, setHasActiveBookings] = useState(false);
  const [hasActiveTimeSlots, setHasActiveTimeSlots] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [isDownloading, setIsDownloading] = useState(false);

  // Extract user ID from token if not available in user object
  useEffect(() => {
    if (user) {
      if (user.id) {
        setUserId(user.id);
        console.log('Using user ID from user object:', user.id);
      } else if (user.token) {
        const decodedToken = parseJwt(user.token);
        if (decodedToken && decodedToken.id) {
          setUserId(decodedToken.id);
          console.log('Extracted user ID from token in dashboard:', decodedToken.id);
        }
      } else {
        // Try to get token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
          const decodedToken = parseJwt(token);
          if (decodedToken && decodedToken.id) {
            setUserId(decodedToken.id);
            console.log('Extracted user ID from localStorage token:', decodedToken.id);
          }
        }
      }
    }
  }, [user]);

  useEffect(() => {
    // Check if user exists and has the correct role
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('User role:', user.role);
    if (user.role !== 'organization') {
      console.log('User is not an organization, redirecting to login');
      setError('Access denied. Organization privileges required.');
      setTimeout(() => {
        handleLogout();
        navigate('/login');
      }, 2000);
      return;
    }

    // Only fetch data if userId is available
    if (userId) {
      console.log('Fetching organization data for user ID:', userId);
      fetchOrgProfile();
    } else {
      console.log('User ID not available yet, waiting...');
    }
  }, [user, navigate, userId]);

  useEffect(() => {
    if (selectedDate && userId && profile) {
      fetchQueueData();
      fetchOrgTimeSlots();
    }
  }, [selectedDate, userId, profile, refreshQueue]);

  const fetchOrgProfile = async () => {
    if (!userId) {
      console.log('Cannot fetch profile: User ID is missing');
      setError('Cannot fetch profile: User ID is missing');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching organization profile for ID:', userId);
      const data = await organizationService.getOrganizationProfile(userId);
      console.log('Profile data received:', data);
      setProfile(data);
      setEditForm({
        name: data.name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        location: data.location || '',
        working_hours: data.working_hours || '',
        password: ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Error fetching profile');
      if (error.response?.status === 403) {
        setTimeout(() => {
          handleLogout();
          navigate('/login');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgTimeSlots = async () => {
    try {
      // First get all time slots for the organization
      const allSlots = await organizationService.getOrganizationTimeSlots(profile.id);
      
      // Then get available slots for the selected date
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const availableSlots = await organizationService.getTimeslots(userId, formattedDate);
      
      // Merge the data to include both availability and active status
      const mergedSlots = allSlots.map(slot => {
        const availableSlot = availableSlots.find(
          available => available.start_time === slot.start_time && available.end_time === slot.end_time
        );
        
        return {
          ...slot,
          available_spots: availableSlot ? availableSlot.available_spots : 0,
          is_full: availableSlot ? availableSlot.is_full : true
        };
      });
      
      setTimeSlots(mergedSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlotError('Failed to fetch time slots');
    }
  };

  const fetchQueueData = async () => {
    if (!userId) return;

    setQueueLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const data = await bookingService.getOrganizationQueue(userId, formattedDate);
      setQueueData(data); // Data is already grouped by time slot from the backend
      setQueueError('');
    } catch (error) {
      console.error('Error fetching queue data:', error);
      setQueueError(error.message || 'Failed to fetch queue data');
    } finally {
      setQueueLoading(false);
    }
  };

  const handlePasswordChange = () => {
    if (!editForm.password) {
      setShowPasswordError('Password cannot be empty');
      return false;
    }
    if (editForm.password !== passwordConfirm) {
      setShowPasswordError('Passwords do not match');
      return false;
    }
    setShowPasswordError('');
    return true;
  };

  const handleUpdate = async () => {
    if (!userId) {
      setError('Cannot update profile: User ID is missing');
      return;
    }

    // If password is provided, validate it
    if (editForm.password && !handlePasswordChange()) {
      return;
    }

    // Check for name and phone validation errors
    if (nameError || phoneError) {
      setError('Please fix the input errors before saving.');
      return;
    }

    // Validate working hours format
    const workingHoursRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (editForm.working_hours && !workingHoursRegex.test(editForm.working_hours)) {
      setWorkingHoursError('Working hours must be in format: HH:MM-HH:MM (e.g., 09:00-17:00)');
      return;
    }

    try {
      const updateData = { ...editForm };
      if (!updateData.password) {
        delete updateData.password;
      }

      const updatedProfile = await organizationService.updateOrganizationProfile(userId, updateData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setPasswordConfirm('');
      setShowPasswordError('');
      setWorkingHoursError('');
      setError('');
      showSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Error updating profile');
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to update this profile.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) {
      setError('Cannot deactivate account: User ID is missing');
      return;
    }

    try {
      // Check for active bookings
      const formattedDate = format(new Date(), 'yyyy-MM-dd');
      const queueDataResponse = await bookingService.getOrganizationQueue(userId, formattedDate);
      
      // Check if there are any active bookings
      const hasActiveBookings = Object.values(queueDataResponse).some(bookings => 
        bookings.some(booking => booking.status === 'Confirmed')
      );

      if (hasActiveBookings) {
        setError('Cannot deactivate account: You have active bookings. Please cancel or complete all active bookings first.');
        setShowDeleteConfirm(false);
        return;
      }

      // Check for active time slots
      const timeSlots = await organizationService.getOrganizationTimeSlots(userId);
      const hasActiveTimeSlots = timeSlots.some(slot => slot.is_active);

      if (hasActiveTimeSlots) {
        setError('Cannot deactivate account: You have active time slots. Please deactivate all time slots first.');
        setShowDeleteConfirm(false);
        return;
      }

      // If no active bookings or time slots, proceed with deactivation
      await organizationService.deleteOrganization(userId);
      handleLogout();
      navigate('/');
    } catch (error) {
      console.error('Error deactivating account:', error);
      setError(error.message || 'Error deactivating account');
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to deactivate this account.');
      }
      setShowDeleteConfirm(false);
    }
  };

  const onLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    handleLogout();
    navigate('/login');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Helper function to format working hours input
  const formatWorkingHours = (input) => {
    // Remove all non-numeric characters
    let digits = input.replace(/[^\d]/g, '');
    
    // Format as HH:MM-HH:MM
    if (digits.length > 0) {
      // First hour
      if (digits.length >= 2) {
        // Ensure hour is valid (00-23)
        let hour = parseInt(digits.substring(0, 2));
        if (hour > 23) hour = 23;
        digits = hour.toString().padStart(2, '0') + digits.substring(2);
        
        // Add colon after hour
        if (digits.length >= 2) {
          digits = digits.substring(0, 2) + ':' + digits.substring(2);
        }
      }
      
      // First minute
      if (digits.length >= 5) {
        // Ensure minute is valid (00-59)
        let minute = parseInt(digits.substring(3, 5));
        if (minute > 59) minute = 59;
        digits = digits.substring(0, 3) + minute.toString().padStart(2, '0') + digits.substring(5);
        
        // Add hyphen after first time
        if (digits.length >= 5) {
          digits = digits.substring(0, 5) + '-' + digits.substring(5);
        }
      }
      
      // Second hour
      if (digits.length >= 8) {
        // Ensure hour is valid (00-23)
        let hour = parseInt(digits.substring(6, 8));
        if (hour > 23) hour = 23;
        digits = digits.substring(0, 6) + hour.toString().padStart(2, '0') + digits.substring(8);
        
        // Add colon after second hour
        if (digits.length >= 8) {
          digits = digits.substring(0, 8) + ':' + digits.substring(8);
        }
      }
      
      // Second minute
      if (digits.length >= 11) {
        // Ensure minute is valid (00-59)
        let minute = parseInt(digits.substring(9, 11));
        if (minute > 59) minute = 59;
        digits = digits.substring(0, 9) + minute.toString().padStart(2, '0');
      }
    }
    
    return digits;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setQueueLoading(true);
      const response = await bookingService.cancelBooking(bookingId);
      setRefreshQueue(prev => prev + 1); // Trigger refresh
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel booking';
      setQueueError(errorMessage);
      setTimeout(() => setQueueError(''), 3000);
    } finally {
      setQueueLoading(false);
    }
  };

  // Add this function to create a new time slot
  const handleCreateTimeSlot = async (e) => {
    e.preventDefault();
    setTimeSlotError('');
    setIsCreatingTimeSlot(true);

    try {
      // Validate inputs
      const capacity = parseInt(newTimeSlot.capacity);
      if (isNaN(capacity) || capacity < 1 || capacity > 50) {
        throw new Error('Capacity must be a number between 1 and 50');
      }

      if (!newTimeSlot.start_time || !newTimeSlot.end_time) {
        throw new Error('Please select both start and end times');
      }

      // Convert times to Date objects for comparison
      const [startHours, startMinutes] = newTimeSlot.start_time.split(':');
      const [endHours, endMinutes] = newTimeSlot.end_time.split(':');
      const startTime = new Date(2000, 0, 1, parseInt(startHours), parseInt(startMinutes));
      const endTime = new Date(2000, 0, 1, parseInt(endHours), parseInt(endMinutes));

      // Check if end time is after start time
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      // Validate against organization's working hours
      if (profile.working_hours) {
        const [workStart, workEnd] = profile.working_hours.split('-');
        const [workStartHours, workStartMinutes] = workStart.split(':');
        const [workEndHours, workEndMinutes] = workEnd.split(':');
        
        const workingStartTime = new Date(2000, 0, 1, parseInt(workStartHours), parseInt(workStartMinutes));
        const workingEndTime = new Date(2000, 0, 1, parseInt(workEndHours), parseInt(workEndMinutes));

        if (startTime < workingStartTime || endTime > workingEndTime) {
          throw new Error(`Time slot must be within working hours (${workStart} - ${workEnd})`);
        }
      } else {
        throw new Error('Please set your organization working hours first');
      }

      // Create time slot with validated data
      await organizationService.createTimeSlot(profile.id, {
        ...newTimeSlot,
        capacity: capacity
      });

      // Reset form
      setNewTimeSlot({
        start_time: '',
        end_time: '',
        capacity: '6'
      });
      
      // Refresh time slots
      await fetchOrgTimeSlots();
      alert('Time slot created successfully!');
    } catch (error) {
      setTimeSlotError(error.message || 'Failed to create time slot');
    } finally {
      setIsCreatingTimeSlot(false);
    }
  };

  // Add this function to delete a time slot
  const handleDeleteTimeSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }

    try {
      setTimeSlotError('');
      
      // First check if there are any active bookings for this time slot
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const queueData = await bookingService.getOrganizationQueue(profile.id, formattedDate);
      
      // Find bookings for this time slot
      const hasActiveBookings = Object.entries(queueData).some(([timeSlotKey, bookings]) => {
        const slot = timeSlots.find(s => 
          `${s.start_time}-${s.end_time}` === timeSlotKey && 
          s.id === slotId
        );
        return slot && bookings.some(b => b.status === 'Confirmed');
      });

      if (hasActiveBookings) {
        setTimeSlotError('Cannot delete time slot: There are active bookings for this slot. Cancel all bookings first.');
        return;
      }

      // If no active bookings, proceed with deletion
      const response = await organizationService.deleteTimeSlot(profile.id, slotId);
      
      if (response.message) {
        alert(response.message);
      }
      
      await fetchOrgTimeSlots(); // Refresh the list
    } catch (error) {
      console.error('Error deleting time slot:', error);
      setTimeSlotError(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete time slot. Make sure there are no active bookings for this slot.'
      );
    }
  };

  // Add this useEffect to fetch time slots when component mounts
  useEffect(() => {
    if (profile?.id) {
      fetchOrgTimeSlots();
    }
  }, [profile]);

  // Add this function to handle showing success messages
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Add this function to check for active items before showing the deactivation modal
  const handleShowDeactivateModal = async () => {
    try {
      // Check for active bookings
      const formattedDate = format(new Date(), 'yyyy-MM-dd');
      const queueDataResponse = await bookingService.getOrganizationQueue(userId, formattedDate);
      const activeBookings = Object.values(queueDataResponse).some(bookings => 
        bookings.some(booking => booking.status === 'Confirmed')
      );
      setHasActiveBookings(activeBookings);

      // Check for active time slots
      const timeSlots = await organizationService.getOrganizationTimeSlots(userId);
      const activeTimeSlots = timeSlots.some(slot => slot.is_active);
      setHasActiveTimeSlots(activeTimeSlots);

      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error checking active items:', error);
      setError('Failed to check active bookings and time slots');
    }
  };

  const handleDownloadData = async (format) => {
    try {
      setIsDownloading(true);
      setError('');
      await organizationService.downloadOrganizationData(format);
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error downloading data:', error);
      setError(error.message || 'Failed to download data. Please try again.');
      
      // If authentication error, redirect to login
      if (error.message.includes('Access denied') || error.message.includes('authentication')) {
        setTimeout(() => {
          handleLogout();
          navigate('/login');
        }, 2000);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading organization dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">User ID: {userId || 'Extracting from token...'}</p>
          {!userId && <p className="mt-1 text-xs text-red-500">If this persists, please try logging in again.</p>}
        </div>
      ) : error ? (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-red-100 border-l-4 border-red-500 p-4 rounded shadow-lg">
          <div className="flex items-start">
            <FaExclamationTriangle className="text-red-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      ) : successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-green-100 border-l-4 border-green-500 p-4 rounded shadow-lg">
          <div className="flex items-start">
            <FaCheck className="text-green-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-green-800 font-medium">Success</h3>
              <p className="text-green-600 mt-1">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-500 hover:text-green-700"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Organization Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 hidden sm:inline">Welcome, {profile?.name}</span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Organization Profile Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <FaBuilding className="mr-3 text-indigo-600" /> Organization Profile
              </h2>
              {!isEditing && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm w-full sm:w-auto"
                  >
                    <FaEdit className="text-base" /> <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm w-full sm:w-auto"
                  >
                    <FaDownload className="text-base" /> <span>Download Data</span>
                  </button>
                  <button
                    onClick={handleShowDeactivateModal}
                    disabled={hasActiveBookings || hasActiveTimeSlots}
                    className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-md text-sm w-full sm:w-auto ${
                      hasActiveBookings || hasActiveTimeSlots
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                    title={
                      hasActiveBookings
                        ? 'Cannot deactivate account while you have active bookings'
                        : hasActiveTimeSlots
                        ? 'Cannot deactivate account while you have active time slots'
                        : 'Deactivate Account'
                    }
                  >
                    <FaTrash className="text-base" /> <span>Deactivate Account</span>
                  </button>
                </div>
              )}
            </div>

            {profile ? (
              isEditing ? (
                <div className="space-y-6 max-w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[A-Za-z\s.'"-]*$/.test(value) || value === '') {
                            setEditForm({ ...editForm, name: value });
                            setNameError('');
                          } else {
                            setNameError('Organization name should not contain numbers or special characters');
                          }
                        }}
                        className={`mt-1 block w-full border ${nameError ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                      />
                      {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={editForm.phone_number}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[0-9+\-\s]*$/.test(value) || value === '') {
                            setEditForm({ ...editForm, phone_number: value });
                            setPhoneError('');
                          } else {
                            setPhoneError('Phone number should only contain numbers, +, and -');
                          }
                        }}
                        className={`mt-1 block w-full border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                      />
                      {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                      <input
                        type="text"
                        value={editForm.working_hours}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[0-9:.-]*$/.test(value) || value === '') {
                            const formattedValue = value === '' ? '' : formatWorkingHours(value);
                            setEditForm({ ...editForm, working_hours: formattedValue });
                            setWorkingHoursError('');
                          }
                        }}
                        placeholder="HH:MM-HH:MM (e.g., 09:00-17:00)"
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {workingHoursError && (
                        <p className="mt-1 text-sm text-red-600">{workingHoursError}</p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editForm.password}
                          placeholder="Leave blank to keep current"
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <div className="mt-1 relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordConfirm}
                          placeholder="Confirm new password"
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                          onClick={toggleConfirmPasswordVisibility}
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      {showPasswordError && (
                        <p className="mt-1 text-sm text-red-600">{showPasswordError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          name: profile.name,
                          email: profile.email,
                          phone_number: profile.phone_number || '',
                          location: profile.location || '',
                          working_hours: profile.working_hours || '',
                          password: ''
                        });
                        setPasswordConfirm('');
                        setShowPasswordError('');
                        setWorkingHoursError('');
                      }}
                      className="flex items-center space-x-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <FaTimes /> <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm"
                    >
                      <FaCheck /> <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Organization Name</h3>
                    <p className="text-gray-900 font-medium">{profile.name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                    <p className="text-gray-900 font-medium">{profile.email}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h3>
                    <p className="text-gray-900 font-medium">{profile.phone_number || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                    <p className="text-gray-900 font-medium">{profile.location || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Working Hours</h3>
                    <p className="text-gray-900 font-medium">{profile.working_hours || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Account Status</h3>
                    <p className="mt-1">
                      {profile.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Inactive
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading profile...</p>
              </div>
            )}
          </div>

          {/* Queue Management Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <FaClock className="text-2xl text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Queue Management</h2>
              </div>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  dateFormat="MMMM d, yyyy"
                  minDate={new Date()}
                  className="form-input rounded-lg shadow-sm border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <button
                  onClick={() => setShowScanner(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md flex items-center space-x-2 font-medium"
                >
                  <FaQrcode className="text-xl" />
                  <span>Scan QR</span>
                </button>
              </div>
            </div>

            {/* Status Legend with enhanced styling */}
            <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaInfoCircle className="mr-2 text-indigo-500" />
                Status Legend
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    Confirmed
                  </span>
                  <span className="text-sm text-gray-600">Active booking</span>
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    Validated
                  </span>
                  <span className="text-sm text-gray-600">QR verified</span>
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                    Checked In
                  </span>
                  <span className="text-sm text-gray-600">Customer present</span>
                </div>
                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-red-100 text-red-800">
                    Cancelled
                  </span>
                  <span className="text-sm text-gray-600">Booking cancelled</span>
                </div>
              </div>
            </div>

            {queueError && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{queueError}</span>
                <button
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                  onClick={() => setQueueError('')}
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {queueLoading ? (
              <div className="flex justify-center items-center py-8">
                <FaSpinner className="animate-spin text-4xl text-blue-500" />
              </div>
            ) : queueError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{queueError}</span>
              </div>
            ) : Object.entries(queueData).map(([timeSlotKey, bookings]) => {
              const [startTime, endTime] = timeSlotKey.split('-');
              return (
                <div key={timeSlotKey} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    <FaClock className="inline mr-2" />
                    {`${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Queue #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking.booking_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">#{booking.queue_position}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.user_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                  ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 
                                    booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                                    'bg-yellow-100 text-yellow-800'}`}>
                                  {booking.status}
                                </span>
                                {booking.is_valid && (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Validated
                                  </span>
                                )}
                                {booking.is_checked_in && (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Checked In
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {booking.status === 'Confirmed' && !booking.is_checked_in && !booking.is_valid ? (
                                <button
                                  onClick={() => handleCancelBooking(booking.booking_id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Cancel
                                </button>
                              ) : booking.is_checked_in ? (
                                <span className="text-gray-400">Cannot Cancel - Checked In</span>
                              ) : booking.is_valid ? (
                                <span className="text-gray-400">Cannot Cancel - Validated</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slot Management Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FaClock className="text-2xl text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Time Slot Management</h2>
            </div>
            
            <form onSubmit={handleCreateTimeSlot} className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Time Slot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newTimeSlot.start_time}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, start_time: e.target.value })}
                    required
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newTimeSlot.end_time}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, end_time: e.target.value })}
                    required
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTimeSlot.capacity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 50)) {
                        setNewTimeSlot({ ...newTimeSlot, capacity: value });
                      }
                    }}
                    required
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
              <div className="mt-6">
                {timeSlotError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600 flex items-center">
                      <FaExclamationCircle className="mr-2" />
                      {timeSlotError}
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isCreatingTimeSlot}
                  className={`flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${
                    isCreatingTimeSlot ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isCreatingTimeSlot ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Create Time Slot
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Time Slots</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(`2000-01-01T${slot.start_time}`), 'hh:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(`2000-01-01T${slot.end_time}`), 'hh:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            slot.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {slot.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {slot.available_spots === 0 && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Full
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteTimeSlot(slot.id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title={slot.available_spots < slot.capacity ? "Warning: This slot has active bookings" : "Delete time slot"}
                          >
                            {slot.available_spots < slot.capacity && (
                              <FaExclamationTriangle className="mr-1 text-yellow-500" />
                            )}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Messages Section */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center">
                  <FaComments className="mr-2 text-gray-500" />
                  Messages
                </h2>
                <button
                  onClick={() => setShowMessages(!showMessages)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showMessages ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {showMessages && (
              <div className="h-[600px]">
                <Conversations 
                  currentUserId={userId} 
                  userRole="organization"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <FaExclamationTriangle className="mx-auto text-4xl text-yellow-500 mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Confirm Account Deactivation</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to deactivate your organization account?</p>
              <p className="text-sm text-red-500 mb-6">This action will disable your account and all its services.</p>
              
              {/* Show warnings for active items */}
              {(hasActiveBookings || hasActiveTimeSlots) && (
                <div className="mb-6 text-left bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">Cannot Deactivate Account</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
                    {hasActiveBookings && (
                      <li>You have active bookings. Please cancel or complete all active bookings first.</li>
                    )}
                    {hasActiveTimeSlots && (
                      <li>You have active time slots. Please deactivate all time slots first.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
              >
                Keep Account
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={hasActiveBookings || hasActiveTimeSlots}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors duration-200
                  ${hasActiveBookings || hasActiveTimeSlots
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
              >
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner onClose={() => {
          setShowScanner(false);
          fetchQueueData(); // Refresh queue data after scanning
        }} />
      )}

      {/* Download Data Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <FaDownload className="text-2xl text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Download Organization Data</h3>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r mb-6">
              <div className="flex items-center">
                <FaFileAlt className="text-blue-500 text-lg mr-3" />
                <p className="text-sm text-blue-700">
                  Your data export will include:
                </p>
              </div>
              <ul className="mt-2 ml-8 list-disc text-sm text-blue-700">
                <li>Organization profile information</li>
                <li>Time slot configurations</li>
                <li>Customer booking records</li>
                <li>Queue management history</li>
                <li>Message history with customers</li>
              </ul>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Format</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDownloadFormat('json')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    downloadFormat === 'json'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <FaFileAlt className="mx-auto text-xl mb-2" />
                    <div className="font-medium">JSON</div>
                    <div className="text-xs mt-1">Complete data structure</div>
                  </div>
                </button>
                <button
                  onClick={() => setDownloadFormat('csv')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    downloadFormat === 'csv'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <FaFileAlt className="mx-auto text-xl mb-2" />
                    <div className="font-medium">CSV</div>
                    <div className="text-xs mt-1">Spreadsheet format</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDownloadData(downloadFormat)}
                disabled={isDownloading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <FaSpinner className="animate-spin text-base" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <FaDownload className="text-base" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDashboard; 