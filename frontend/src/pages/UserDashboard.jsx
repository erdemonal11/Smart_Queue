import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaUser, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash, FaTrash, FaClock, FaCalendar, FaSpinner, FaQrcode } from 'react-icons/fa';
import { format } from 'date-fns';
import bookingService from '../services/bookingService';
import userService from '../services/userService';
import organizationService from '../services/organizationService';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import qrService from '../services/qrService';
import { QRCodeSVG } from 'qrcode.react';

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
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center mb-2 sm:mb-0">
              <FaUser className="mr-2" /> My Profile
            </h2>
            {!isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                >
                  <FaEdit /> <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  <FaTrash /> <span>Delete Account</span>
                </button>
              </div>
            )}
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

          {profile ? (
            isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow letters, spaces, and some special characters in name
                        if (/^[A-Za-z\s.'"-]*$/.test(value) || value === '') {
                          setEditForm({ ...editForm, name: value });
                          setNameError('');
                        } else {
                          setNameError('Name should not contain numbers or special characters');
                        }
                      }}
                      className={`mt-1 block w-full border ${nameError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    />
                    {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone_number}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow numbers, plus sign, and hyphens in phone number
                        if (/^[0-9+\-\s]*$/.test(value) || value === '') {
                          setEditForm({ ...editForm, phone_number: value });
                          setPhoneError('');
                        } else {
                          setPhoneError('Phone number should only contain numbers, +, and -');
                        }
                      }}
                      className={`mt-1 block w-full border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm p-2`}
                    />
                    {phoneError && <p className="mt-1 text-sm text-red-600">{phoneError}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password (leave blank to keep current)</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2 pr-10"
                      />
                      <div 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
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
                    className="flex items-center space-x-1 bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    <FaTimes /> <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    <FaCheck /> <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="mt-1 text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone Number</h3>
                  <p className="mt-1 text-gray-900">{profile.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
                  <p className="mt-1 text-gray-900">
                    {profile.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
      </div>

      {/* Create New Booking Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Booking</h2>
          
          {bookingError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{bookingError}</span>
              <button
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                onClick={() => setBookingError('')}
              >
                <FaTimes />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Organization
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowOrgResults(true);
                }}
                onFocus={() => setShowOrgResults(true)}
              />
              {showOrgResults && filteredOrgs.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredOrgs.map(org => (
                    <div
                      key={org.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedOrg(org);
                        setSearchTerm(`${org.name} - ${org.location}`);
                        setShowOrgResults(false);
                        setSelectedTimeSlot(null);
                      }}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-600">{org.location}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={date => {
                  setSelectedDate(date);
                  setSelectedTimeSlot(null);
                }}
                minDate={new Date()}
                dateFormat="MMMM d, yyyy"
                filterDate={date => {
                  // Return false for Saturday (6) and Sunday (0)
                  return date.getDay() !== 6 && date.getDay() !== 0;
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            {selectedOrg && selectedDate && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time Slot
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableTimeSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot.id)}
                      className={`p-2 text-sm rounded-md ${
                        selectedTimeSlot === slot.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {format(new Date(`2000-01-01T${slot.start_time}`), 'hh:mm a')} - {format(new Date(`2000-01-01T${slot.end_time}`), 'hh:mm a')}
                      {slot.available_spots > 0 && ` (${slot.available_spots} spots)`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCreateBooking}
              disabled={!selectedOrg || !selectedDate || !selectedTimeSlot || isBooking}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                !selectedOrg || !selectedDate || !selectedTimeSlot || isBooking
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isBooking ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Creating Booking...</span>
                </>
              ) : (
                <>
                  <FaCalendar />
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Account Deletion</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete your account?</p>
            <p className="text-sm text-red-500 mb-6">This action is irreversible.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                Delete Account
              </button>
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
                  renderAs="svg"
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
    </div>
  );
};

export default UserDashboard; 