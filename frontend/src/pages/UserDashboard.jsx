import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaUser, FaEdit, FaCheck, FaTimes, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';

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

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setProfile(data);
      setEditForm({
        name: data.name,
        email: data.email,
        phone_number: data.phone_number || '',
        password: ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
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

      const response = await fetch(`http://localhost:3000/api/users/profile/${user.id}`, {
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
      setError('');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(`Error updating profile: ${error.message}`);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/users/profile/${user.id}`, {
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
    </div>
  );
};

export default UserDashboard; 