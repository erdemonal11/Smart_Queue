import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaUser, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash, FaTrash, FaClock, FaCalendar, FaSpinner, FaQrcode, FaComments, FaSearch, FaCalendarAlt, FaPowerOff, FaExclamationTriangle, FaCalendarPlus, FaDownload, FaFileAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import bookingService from '../services/bookingService';
import userService from '../services/userService';
import organizationService from '../services/organizationService';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import qrService from '../services/qrService';
import { QRCodeSVG } from 'qrcode.react';
import Conversations from '../components/Conversations';

const UserDashboard = () => {
  const { user, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: ''
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [showOrgResults, setShowOrgResults] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [qrError, setQrError] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchUserBookings();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedOrg, selectedDate]);

  useEffect(() => {
    const filterOrganizations = () => {
      if (!searchTerm.trim()) {
        setFilteredOrgs([]);
        return;
      }
      
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(searchTermLower) ||
        (org.location && org.location.toLowerCase().includes(searchTermLower))
      );
      setFilteredOrgs(filtered);
    };

    filterOrganizations();
  }, [searchTerm, organizations]);

  const fetchUserProfile = async () => {
    try {
      const data = await userService.getUserProfile(user.id);
      setProfile(data);
      setEditForm({
        name: data.name,
        email: data.email,
        phone_number: data.phone_number || '',
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
    }
  };

  const fetchUserBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getUserBookings();
      console.log('Fetched bookings:', data); // Debug log
      setBookings(data);
    } catch (err) {
      setError('Failed to fetch your bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const data = await organizationService.getActiveOrganizations();
      setOrganizations(data);
    } catch (error) {
      setError('Failed to fetch organizations');
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const slots = await organizationService.getTimeslots(selectedOrg.id, formattedDate);
      setAvailableTimeSlots(slots);
    } catch (error) {
      setError('Failed to fetch time slots');
    }
  };

  const handleUpdate = async () => {
    // Validate inputs before submitting
    if (nameError || phoneError) {
      setError('Please fix the errors before saving.');
      return;
    }

    try {
      const updateData = { ...editForm };
      if (!updateData.password) {
        delete updateData.password;
      }

      const updatedProfile = await userService.updateUserProfile(user.id, updateData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setError('');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Error updating profile');
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to update this profile.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Double check for active bookings
      const hasActiveBookings = bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in);
      
      if (hasActiveBookings) {
        setError('Cannot deactivate account: You have active bookings. Please cancel or complete all active bookings first.');
        setShowDeleteConfirm(false);
        return;
      }

      // Additional safety check before proceeding
      const currentBookings = await bookingService.getUserBookings();
      const stillHasActiveBookings = currentBookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in);
      
      if (stillHasActiveBookings) {
        setError('Cannot deactivate account: You have active bookings. Please cancel or complete all active bookings first.');
        setShowDeleteConfirm(false);
        return;
      }

      await userService.deleteUser(user.id);
      handleLogout();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Error deleting account');
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to delete this account.');
      }
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

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setLoading(true);
      await bookingService.cancelBooking(bookingId);
      await fetchUserBookings(); // Refresh the list
      alert('Booking cancelled successfully');
    } catch (err) {
      setError('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedOrg || !selectedDate || !selectedTimeSlot) {
      setBookingError('Please select all required fields');
      return;
    }

    try {
      setIsBooking(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const bookingData = {
        organizationId: selectedOrg.id,
        date: formattedDate,
        timeslotId: selectedTimeSlot
      };
      
      await bookingService.createBooking(bookingData);
      
      // Reset form and refresh bookings
      setSelectedOrg(null);
      setSelectedTimeSlot(null);
      setBookingError('');
      await fetchUserBookings();
      alert('Booking created successfully!');
    } catch (error) {
      console.error('Booking error:', error);
      // Get the error message from the error object
      const errorMessage = error.error || error.message || 'Failed to create booking';
      setBookingError(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const handleGenerateQR = async (booking) => {
    setQrError('');
    try {
      let qrCodeData;
      if (booking.qr_generated) {
        // If QR is already generated, just get it
        qrCodeData = await qrService.getQRCode(booking.id);
      } else {
        // Generate new QR code
        qrCodeData = await qrService.generateQRCode(booking.id);
      }
      
      if (qrCodeData) {
        setQrCode(qrCodeData);
        setSelectedBooking(booking);
        setShowQRModal(true);
        // Only refresh bookings if we generated a new QR code
        if (!booking.qr_generated) {
          await fetchUserBookings();
        }
      }
    } catch (error) {
      console.error('Error with QR code:', error);
      setQrError(error.message || 'Failed to handle QR code');
      setTimeout(() => setQrError(''), 3000);
    }
  };

  const handleDownloadPDF = async (bookingId) => {
    try {
      await qrService.generatePDF(bookingId);
    } catch (error) {
      setError('Failed to download PDF');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleShowDeactivateModal = () => {
    // Check for active bookings before showing modal
    const hasActiveBookings = bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in);
    
    if (hasActiveBookings) {
      setError('Cannot deactivate account: You have active bookings. Please cancel or complete all active bookings first.');
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const handleDownloadData = async (format) => {
    try {
      setIsDownloading(true);
      setError('');
      await userService.downloadUserData(user.id, format);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">User Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 hidden sm:inline">Welcome, {profile?.name}</span>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              <FaSignOutAlt /> <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaUser className="mr-3 text-indigo-600" /> My Profile
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
                  <FaDownload className="text-base" /> <span>Download My Data</span>
                </button>
                <button
                  onClick={handleShowDeactivateModal}
                  disabled={bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in)}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-md text-sm w-full sm:w-auto ${
                    bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                  title={bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in) 
                    ? 'Cannot deactivate account while you have active bookings' 
                    : 'Deactivate Account'}
                >
                  <FaPowerOff className="text-base" /> <span>Deactivate Account</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTimes className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  className="ml-auto pl-3"
                  onClick={() => setError('')}
                >
                  <FaTimes className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
          )}

          {profile ? (
            isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^[A-Za-z\s.'"-]*$/.test(value) || value === '') {
                          setEditForm({ ...editForm, name: value });
                          setNameError('');
                        } else {
                          setNameError('Name should only contain letters and basic punctuation');
                        }
                      }}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        nameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } focus:border-transparent focus:ring-2 transition-all duration-200`}
                    />
                    {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-transparent focus:ring-2 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        phoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                      } focus:border-transparent focus:ring-2 transition-all duration-200`}
                      placeholder="+1234567890"
                    />
                    {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password (leave blank to keep current)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-transparent focus:ring-2 transition-all duration-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        name: profile.name,
                        email: profile.email,
                        phone_number: profile.phone_number || '',
                        password: ''
                      });
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 text-sm"
                  >
                    <FaTimes className="text-base" /> <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                  >
                    <FaCheck className="text-base" /> <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="text-lg font-medium text-gray-900">{profile.name}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="text-lg font-medium text-gray-900">{profile.email}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                  <p className="text-lg font-medium text-gray-900">{profile.phone_number || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
                  <div className="flex items-center">
                    {profile.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <FaCheck className="mr-2" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <FaTimes className="mr-2" /> Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex justify-center items-center py-8">
              <FaSpinner className="animate-spin text-3xl text-indigo-600" />
            </div>
          )}
        </div>
      </div>

      {/* Create New Booking Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <FaCalendar className="mr-3 text-indigo-600" /> Create New Booking
          </h2>
          
          {bookingError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTimes className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{bookingError}</p>
                </div>
                <button
                  className="ml-auto pl-3"
                  onClick={() => setBookingError('')}
                >
                  <FaTimes className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <FaSearch className="mr-2 text-indigo-600" /> Search Organization
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-transparent focus:ring-2 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowOrgResults(true);
                  }}
                  onFocus={() => setShowOrgResults(true)}
                />
                {showOrgResults && filteredOrgs.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    {filteredOrgs.map(org => (
                      <div
                        key={org.id}
                        className="p-4 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 transition-colors duration-150"
                        onClick={() => {
                          setSelectedOrg(org);
                          setSearchTerm(`${org.name} - ${org.location}`);
                          setShowOrgResults(false);
                          setSelectedTimeSlot(null);
                        }}
                      >
                        <div className="font-medium text-gray-900">{org.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{org.location}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <FaCalendarAlt className="mr-2 text-indigo-600" /> Select Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={date => {
                  setSelectedDate(date);
                  setSelectedTimeSlot(null);
                }}
                minDate={new Date()}
                dateFormat="MMMM d, yyyy"
                filterDate={date => date.getDay() !== 6 && date.getDay() !== 0}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-indigo-500 focus:border-transparent focus:ring-2 transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
          </div>

          {selectedOrg && selectedDate && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <FaClock className="mr-2 text-indigo-600" /> Select Time Slot
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {availableTimeSlots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedTimeSlot(slot.id)}
                    className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                      selectedTimeSlot === slot.id
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100 shadow-md hover:shadow-lg'
                    }`}
                  >
                    <div className="text-base">{format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')}</div>
                    <div className="text-base">{format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}</div>
                    {slot.available_spots > 0 && (
                      <div className={`text-xs mt-2 font-medium px-2 py-1 rounded-full ${
                        selectedTimeSlot === slot.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {slot.available_spots} spots left
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleCreateBooking}
              disabled={!selectedOrg || !selectedDate || !selectedTimeSlot || isBooking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                !selectedOrg || !selectedDate || !selectedTimeSlot || isBooking
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isBooking ? (
                <>
                  <FaSpinner className="animate-spin text-base" />
                  <span>Creating Booking...</span>
                </>
              ) : (
                <>
                  <FaCalendarPlus className="text-base" />
                  <span>Create Booking</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Bookings</h2>
          
          {/* Add Status Legend */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Status Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Confirmed
                </span>
                <span className="text-sm text-gray-600">Your booking has been confirmed</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  Validated
                </span>
                <span className="text-sm text-gray-600">QR code has been scanned by organization</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                  Checked In
                </span>
                <span className="text-sm text-gray-600">You have been checked in at the venue</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Cancelled
                </span>
                <span className="text-sm text-gray-600">Booking has been cancelled</span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <button
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setError('')}
              >
                <FaTimes />
              </button>
            </div>
          )}

          {qrError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">QR Error: </strong>
              <span className="block sm:inline">{qrError}</span>
              <button
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setQrError('')}
              >
                <FaTimes />
              </button>
            </div>
          )}

          {bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Queue Position
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
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.organization_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <FaCalendar className="inline mr-2" />
                          {format(new Date(booking.date), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <FaClock className="inline mr-2" />
                          {booking.time_slot || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm bg-blue-100 text-blue-800 inline-flex items-center px-2.5 py-0.5 rounded-full">
                          #{booking.queue_position}
                        </div>
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
                        {booking.status === 'Confirmed' && !booking.is_checked_in && (
                          <div className="flex flex-col space-y-2">
                            {booking.qr_generated === true ? (
                              <>
                                <button
                                  onClick={() => handleDownloadPDF(booking.id)}
                                  className="text-green-600 hover:text-green-900 flex items-center"
                                >
                                  <FaCalendar className="mr-1" /> Download PDF
                                </button>
                                <button
                                  onClick={() => handleGenerateQR(booking)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                >
                                  <FaQrcode className="mr-1" /> Show QR
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGenerateQR(booking)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                >
                                  <FaQrcode className="mr-1" /> Generate QR
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="text-red-600 hover:text-red-900 flex items-center"
                                >
                                  <FaTimes className="mr-1" /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {booking.status === 'Confirmed' && booking.is_checked_in && (
                          <span className="text-gray-400">Checked In</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">You don't have any bookings yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages Section */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <FaComments className="text-lg text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Messages</h2>
              </div>
              <div className="bg-white/10 px-3 py-1 rounded-full">
                <span className="text-sm text-white font-medium">Smart Queue Messaging</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-[400px]">
            <div className="absolute inset-0">
              <Conversations currentUserId={user.id} userRole={user.role} />
            </div>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-200 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-orange-100 p-3 rounded-full">
                <FaPowerOff className="text-2xl text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Deactivate Account</h3>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r mb-6">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-yellow-500 text-lg mr-3" />
                <p className="text-sm text-yellow-700">
                  {bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in)
                    ? "You cannot deactivate your account while you have active bookings. Please cancel or complete your bookings first."
                    : "Warning: This action cannot be undone directly. You will need to contact support to reactivate your account."}
                </p>
              </div>
            </div>

            {!bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in) && (
              <>
                <div className="text-gray-600 mb-4">
                  Are you sure you want to deactivate your account? This will:
                </div>
                <ul className="list-disc ml-6 mb-6 space-y-1">
                  <li>Hide your profile from the platform</li>
                  <li>Cancel any pending bookings</li>
                  <li>Prevent new bookings</li>
                </ul>
                <p className="text-gray-600 mb-6">
                  You can reactivate your account by contacting support.
                </p>
              </>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 text-sm"
              >
                {bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in) ? 'Close' : 'Cancel'}
              </button>
              {!bookings.some(booking => booking.status === 'Confirmed' && !booking.is_checked_in) && (
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                >
                  Deactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add QR Code Modal */}
      {selectedBooking && qrCode && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Booking QR Code</h2>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setQrCode(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <QRCodeSVG 
                  value={qrCode.qrCode}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <div className="mt-6 text-center space-y-2">
                <p className="text-lg font-semibold text-gray-800">{selectedBooking.organization_name}</p>
                <p className="text-gray-600">{format(new Date(selectedBooking.date), 'MMMM d, yyyy')}</p>
                <p className="text-gray-600">{selectedBooking.time_slot}</p>
                <p className="text-gray-600 font-medium">Queue Position: #{selectedBooking.queue_position}</p>
              </div>
              <button
                onClick={() => handleDownloadPDF(selectedBooking.id)}
                className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center space-x-2"
              >
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Data Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <FaDownload className="text-2xl text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Download My Data</h3>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r mb-6">
              <div className="flex items-center">
                <FaFileAlt className="text-blue-500 text-lg mr-3" />
                <p className="text-sm text-blue-700">
                  Your data export will include:
                </p>
              </div>
              <ul className="mt-2 ml-8 list-disc text-sm text-blue-700">
                <li>Personal profile information</li>
                <li>Booking history and queue records</li>
                <li>Message history with organizations</li>
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

export default UserDashboard; 