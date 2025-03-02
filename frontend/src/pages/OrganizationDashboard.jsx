import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaBuilding, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';

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

  const fetchOrgProfile = async () => {
    if (!userId) {
      console.log('Cannot fetch profile: User ID is missing');
      setError('Cannot fetch profile: User ID is missing');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching organization profile for ID:', userId);
      const response = await fetch(`http://localhost:3000/api/organizations/profile/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Profile response status:', response.status);
      if (response.status === 403) {
        setError('Access denied. You do not have permission to view this profile.');
        setTimeout(() => {
          handleLogout();
          navigate('/login');
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const data = await response.json();
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
      setError(`Error fetching profile: ${error.message}`);
    } finally {
      setLoading(false);
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

      const response = await fetch(`http://localhost:3000/api/organizations/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.status === 403) {
        setError('Access denied. You do not have permission to update this profile.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setIsEditing(false);
      setPasswordConfirm('');
      setShowPasswordError('');
      setWorkingHoursError('');
      setError('');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(`Error updating profile: ${error.message}`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) {
      setError('Cannot delete account: User ID is missing');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/organizations/profile/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 403) {
        setError('Access denied. You do not have permission to delete this account.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to delete account: ${response.status}`);
      }

      handleLogout();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(`Error deleting account: ${error.message}`);
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
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      ) : (
        <>
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
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center mb-2 sm:mb-0">
                  <FaBuilding className="mr-2" /> Organization Profile
                </h2>
                {!isEditing && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
                    >
                      <FaEdit /> <span>Edit</span>
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

              {profile ? (
                isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Organization Name</label>
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
                            setNameError('Organization name should not contain numbers or special characters');
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
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Working Hours</label>
                      <input
                        type="text"
                        value={editForm.working_hours}
                        onChange={(e) => {
                          // Only allow numbers, colon, and hyphen
                          const value = e.target.value;
                          const regex = /^[0-9:.-]*$/;
                          
                          if (regex.test(value) || value === '') {
                            // Format the input as the user types
                            const formattedValue = value === '' ? '' : formatWorkingHours(value);
                            setEditForm({ ...editForm, working_hours: formattedValue });
                            setWorkingHoursError('');
                          }
                        }}
                        onBlur={() => {
                          // Validate format on blur
                          if (editForm.working_hours) {
                            const workingHoursRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                            if (!workingHoursRegex.test(editForm.working_hours)) {
                              setWorkingHoursError('Working hours must be in format: HH:MM-HH:MM (e.g., 09:00-17:00)');
                            }
                          }
                        }}
                        placeholder="HH:MM-HH:MM (e.g., 09:00-17:00)"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                      {workingHoursError && (
                        <p className="mt-1 text-sm text-red-600">{workingHoursError}</p>
                      )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                      <div className="mt-1 relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm p-2 pr-10"
                        />
                        <div 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                          onClick={toggleConfirmPasswordVisibility}
                        >
                          {showConfirmPassword ? (
                            <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </div>
                      </div>
                      {showPasswordError && (
                        <p className="mt-1 text-sm text-red-600">{showPasswordError}</p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3">
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
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Organization Name</h3>
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
                      <h3 className="text-sm font-medium text-gray-500">Location</h3>
                      <p className="mt-1 text-gray-900">{profile.location || 'Not provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Working Hours</h3>
                      <p className="mt-1 text-gray-900">{profile.working_hours || 'Not provided'}</p>
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
            
            <div className="mt-8 bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="text-center py-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Queue Management</h2>
                <p className="text-gray-600">Queue functionality will be implemented in a future update.</p>
                <p className="text-gray-500 mt-2">Stay tuned for new features!</p>
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Account Deletion</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete your organization account?</p>
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
    </div>
  );
};

export default OrganizationDashboard; 