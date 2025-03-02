import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaSignOutAlt, FaUser, FaBuilding, FaEdit, FaTrash, FaCheck, FaTimes, FaChartBar, FaKey, FaSortAmountDown, FaSortAmountUp, FaExclamationTriangle } from 'react-icons/fa';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AdminDashboard = () => {
  const { user, handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ show: false, type: '', id: null });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', phone_number: '' });
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    phone_number: '', 
    location: '', 
    working_hours: '' 
  });
  const [stats, setStats] = useState({
    activeUsers: 0,
    inactiveUsers: 0,
    activeOrgs: 0,
    inactiveOrgs: 0,
    totalUsers: 0,
    totalOrgs: 0
  });
  const [error, setError] = useState('');
  const [sorting, setSorting] = useState({
    users: { field: 'name', direction: 'asc' },
    organizations: { field: 'name', direction: 'asc' }
  });
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordError, setShowPasswordError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState({ show: false, type: '', id: null, entity: null });
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [inputValidation, setInputValidation] = useState({
    name: { valid: true, message: '' },
    email: { valid: true, message: '' },
    phone: { valid: true, message: '' }
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchUsers();
    fetchOrganizations();
  }, [user, navigate]);

  useEffect(() => {
    // Calculate statistics whenever users or organizations change
    console.log('Calculating stats from:', organizations.length, 'organizations');
    
    const activeUsers = users.filter(user => user.is_active === 1 || user.is_active === true).length;
    const inactiveUsers = users.filter(user => user.is_active === 0 || user.is_active === false || user.is_active === null || user.is_active === undefined).length;
    
    // Explicitly count active and inactive organizations with comprehensive checks
    const activeOrgs = organizations.filter(org => org.is_active === 1 || org.is_active === true).length;
    const inactiveOrgs = organizations.filter(org => 
      org.is_active === 0 || 
      org.is_active === false || 
      org.is_active === null || 
      org.is_active === undefined
    ).length;
    
    console.log(`STATS CALCULATION - Active orgs: ${activeOrgs}, Inactive orgs: ${inactiveOrgs}, Total: ${organizations.length}`);
    console.log('INACTIVE ORGS IN STATS:', organizations.filter(org => 
      org.is_active === 0 || 
      org.is_active === false || 
      org.is_active === null || 
      org.is_active === undefined
    ).map(org => `ID: ${org.id}, Name: ${org.name}, is_active: ${org.is_active}`));
    
    setStats({
      activeUsers,
      inactiveUsers,
      activeOrgs,
      inactiveOrgs,
      totalUsers: users.length,
      totalOrgs: organizations.length
    });
  }, [users, organizations]);

  // Sort function
  const sortData = (data, field, direction) => {
    return [...data].sort((a, b) => {
      let aValue = (a[field] ?? '').toString().toLowerCase();
      let bValue = (b[field] ?? '').toString().toLowerCase();
      return direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  };

  // Handle sort
  const handleSort = (type, field) => {
    setSorting(prev => {
      const newDirection = 
        prev[type].field === field && prev[type].direction === 'asc' 
          ? 'desc' 
          : 'asc';
      
      return {
        ...prev,
        [type]: { field, direction: newDirection }
      };
    });
  };

  // Sort users and organizations
  const sortedUsers = sortData(users, sorting.users.field, sorting.users.direction);
  const sortedOrganizations = sortData(organizations, sorting.organizations.field, sorting.organizations.direction);

  // Debug log to verify data
  useEffect(() => {
    console.log('Current organizations state:', organizations);
    console.log('Sorted organizations:', sortedOrganizations);
  }, [organizations, sortedOrganizations]);

  // Chart configurations
  const userStatusData = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        data: [stats.activeUsers, stats.inactiveUsers],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 1,
      },
    ],
  };

  const orgStatusData = {
    labels: ['Active', 'Inactive'],
    datasets: [
      {
        data: [stats.activeOrgs, stats.inactiveOrgs],
        backgroundColor: ['#3B82F6', '#F59E0B'],
        borderColor: ['#2563EB', '#D97706'],
        borderWidth: 1,
      },
    ],
  };

  const totalStatsData = {
    labels: ['Users', 'Organizations'],
    datasets: [
      {
        label: 'Active',
        data: [stats.activeUsers, stats.activeOrgs],
        backgroundColor: '#10B981',
      },
      {
        label: 'Inactive',
        data: [stats.inactiveUsers, stats.inactiveOrgs],
        backgroundColor: '#EF4444',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  // Add debug log for chart data
  useEffect(() => {
    console.log('CHART DATA - Organization Status:', {
      active: stats.activeOrgs,
      inactive: stats.inactiveOrgs,
      total: stats.totalOrgs
    });
  }, [stats]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 403) {
        setError('Access denied. Admin privileges required.');
        handleLogout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchOrganizations = async () => {
    try {
      // First, check if the admin-specific endpoint exists
      let response = await fetch('http://localhost:3000/api/organizations/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // If the admin endpoint doesn't exist, we need to modify our backend
      if (response.status === 404) {
        console.log('Admin endpoint not found, using standard endpoint');
        response = await fetch('http://localhost:3000/api/organizations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      if (response.status === 403) {
        setError('Access denied. Admin privileges required.');
        handleLogout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      console.log('ORGANIZATIONS RAW DATA:', data); // Debug log
      
      // Ensure we're setting ALL organizations
      if (Array.isArray(data)) {
        // Force convert any boolean is_active to numbers for consistency
        const processedData = data.map(org => ({
          ...org,
          is_active: org.is_active === true ? 1 : (org.is_active === false ? 0 : org.is_active)
        }));
        
        setOrganizations(processedData);
        console.log('PROCESSED ORGANIZATIONS:', processedData.length, 'organizations');
        
        // Debug counts with explicit type checking
        const activeCount = processedData.filter(org => org.is_active === 1 || org.is_active === true).length;
        const inactiveCount = processedData.filter(org => 
          org.is_active === 0 || 
          org.is_active === false || 
          org.is_active === null || 
          org.is_active === undefined
        ).length;
        
        console.log(`ORGANIZATION STATUS CHECK - Active: ${activeCount}, Inactive: ${inactiveCount}, Total: ${processedData.length}`);
        console.log('INACTIVE ORGS:', processedData.filter(org => 
          org.is_active === 0 || 
          org.is_active === false || 
          org.is_active === null || 
          org.is_active === undefined
        ));
      } else {
        console.error('API returned non-array data for organizations:', data);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    }
  };

  // Validate input fields
  const validateInput = (field, value) => {
    let isValid = true;
    let message = '';

    switch (field) {
      case 'name':
        // Name should not contain numbers or special characters
        if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(value)) {
          isValid = false;
          message = 'Name should not contain numbers or special characters';
        }
        break;
      case 'email':
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          isValid = false;
          message = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        // Phone should only contain numbers and optional +
        if (!/^[+]?[0-9]+$/.test(value)) {
          isValid = false;
          message = 'Phone number should only contain numbers';
        }
        break;
      default:
        break;
    }

    setInputValidation(prev => ({
      ...prev,
      [field]: { valid: isValid, message }
    }));

    return isValid;
  };

  // Handle password change
  const handlePasswordChange = () => {
    // Reset error
    setPasswordError('');

    // Validate password
    if (!passwordData.password) {
      setPasswordError('Password cannot be empty');
      return false;
    }

    if (passwordData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }

    return true;
  };

  // Apply password change
  const applyPasswordChange = async () => {
    if (!handlePasswordChange()) {
      return;
    }

    try {
      const { id, type } = showPasswordModal;
      const endpoint = type === 'user' ? `http://localhost:3000/api/users/${id}` : `http://localhost:3000/api/organizations/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: passwordData.password })
      });

      if (response.ok) {
        // Reset and close modal
        setShowPasswordModal({ show: false, type: '', id: null, entity: null });
        setPasswordData({ password: '', confirmPassword: '' });
        setPasswordError('');
        
        // Show success message
        setError(`Password for ${type} updated successfully`);
        setTimeout(() => setError(''), 3000);
      } else {
        throw new Error(`Failed to update password: ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(`Error: ${error.message}`);
    }
  };

  const handleUserAction = async (action, userId, userData = null) => {
    try {
      // Validate input fields if updating
      if (action === 'update' && userData) {
        const nameValid = validateInput('name', userData.name);
        const emailValid = validateInput('email', userData.email);
        const phoneValid = userData.phone_number ? validateInput('phone', userData.phone_number) : true;
        
        if (!nameValid || !emailValid || !phoneValid) {
          return;
        }
      }

      if (userData?.password && !handlePasswordChange(userData, userData.password)) {
        return;
      }

      let method = 'PUT';
      if (action === 'delete') method = 'DELETE';

      const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: userData ? JSON.stringify(userData) : null
      });

      if (response.ok) {
        fetchUsers();
        setEditingUser(null);
        setShowDeleteConfirm({ show: false, type: '', id: null });
        setPasswordConfirm('');
        setShowPasswordError('');
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleOrgAction = async (action, orgId, orgData = null) => {
    try {
      // Validate input fields if updating
      if (action === 'update' && orgData) {
        const nameValid = validateInput('name', orgData.name);
        const emailValid = validateInput('email', orgData.email);
        const phoneValid = orgData.phone_number ? validateInput('phone', orgData.phone_number) : true;
        
        if (!nameValid || !emailValid || !phoneValid) {
          return;
        }
      }

      let method = 'PUT';
      if (action === 'delete') method = 'DELETE';

      const response = await fetch(`http://localhost:3000/api/organizations/${orgId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: orgData ? JSON.stringify(orgData) : null
      });

      if (response.ok) {
        fetchOrganizations();
        setEditingOrg(null);
        setShowDeleteConfirm({ show: false, type: '', id: null });
      }
    } catch (error) {
      console.error('Error updating organization:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setNewUser({ name: '', email: '', password: '', phone_number: '' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/organizations/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newOrg)
      });

      if (response.ok) {
        setNewOrg({ 
          name: '', 
          email: '', 
          password: '', 
          phone_number: '', 
          location: '', 
          working_hours: '' 
        });
        fetchOrganizations();
      }
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const onLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    handleLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600 hidden sm:inline">Welcome, Admin</span>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              <FaSignOutAlt /> <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Dashboard Stats */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-64">
              <h3 className="text-lg font-semibold mb-2">User Status</h3>
              <div className="h-56">
                <Pie data={userStatusData} options={chartOptions} />
              </div>
            </div>
            <div className="h-64">
              <h3 className="text-lg font-semibold mb-2">Organization Status</h3>
              <div className="h-56">
                <Pie data={orgStatusData} options={chartOptions} />
              </div>
            </div>
            <div className="h-64">
              <h3 className="text-lg font-semibold mb-2">Total Statistics</h3>
              <div className="h-56">
                <Bar data={totalStatsData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Users Management</h2>
          
          {/* Add User Form */}
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="border rounded p-2"
              required
            />
            <div className="flex">
              <input
                type="text"
                placeholder="Phone Number"
                value={newUser.phone_number}
                onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                className="border rounded p-2 flex-grow mr-2"
              />
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                Add User
              </button>
            </div>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 sm:px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('users', 'name')}>
                    Name {sorting.users.field === 'name' && (
                      sorting.users.direction === 'asc' ? <FaSortAmountUp className="inline ml-1" /> : <FaSortAmountDown className="inline ml-1" />
                    )}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left">Email</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left">Phone</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-100">
                      <td className="px-4 sm:px-6 py-4 font-medium">
                        {editingUser?.id === user.id ? (
                          <>
                            <input
                              type="text"
                              value={editingUser.name}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('name', value);
                                setEditingUser({ ...editingUser, name: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.name.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.name.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.name.message}</p>
                            )}
                          </>
                        ) : user.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {editingUser?.id === user.id ? (
                          <>
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('email', value);
                                setEditingUser({ ...editingUser, email: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.email.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.email.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.email.message}</p>
                            )}
                          </>
                        ) : user.email}
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                        {editingUser?.id === user.id ? (
                          <>
                            <input
                              type="text"
                              value={editingUser.phone_number}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('phone', value);
                                setEditingUser({ ...editingUser, phone_number: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.phone.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.phone.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.phone.message}</p>
                            )}
                          </>
                        ) : user.phone_number}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {editingUser?.id === user.id ? (
                          <select
                            value={editingUser.is_active}
                            onChange={(e) => setEditingUser({ ...editingUser, is_active: parseInt(e.target.value) })}
                            className="border rounded p-1"
                          >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                          </select>
                        ) : (
                          <span className={user.is_active === 1 || user.is_active === true ? 'text-green-500' : 'text-red-500 font-bold'}>
                            {user.is_active === 1 || user.is_active === true ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex space-x-2">
                          {editingUser?.id === user.id ? (
                            <>
                              <button
                                onClick={() => handleUserAction('update', user.id, editingUser)}
                                className="text-green-500 hover:text-green-700"
                                title="Save changes"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="text-red-500 hover:text-red-700"
                                title="Cancel"
                              >
                                <FaTimes />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingUser({ ...user })}
                                className="text-blue-500 hover:text-blue-700"
                                title="Edit user"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => setShowPasswordModal({ show: true, type: 'user', id: user.id, entity: user })}
                                className="text-yellow-500 hover:text-yellow-700"
                                title="Change password"
                              >
                                <FaKey />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ show: true, type: 'user', id: user.id })}
                                className="text-red-500 hover:text-red-700"
                                title="Delete user"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Organizations Management */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Organizations Management</h2>
          
          {/* Add Organization Form */}
          <form onSubmit={handleCreateOrg} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="Organization Name"
              value={newOrg.name}
              onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newOrg.email}
              onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newOrg.password}
              onChange={(e) => setNewOrg({ ...newOrg, password: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={newOrg.phone_number}
              onChange={(e) => setNewOrg({ ...newOrg, phone_number: e.target.value })}
              className="border rounded p-2"
              required
            />
            <input
              type="text"
              placeholder="Location"
              value={newOrg.location}
              onChange={(e) => setNewOrg({ ...newOrg, location: e.target.value })}
              className="border rounded p-2"
            />
            <div className="flex">
              <input
                type="text"
                placeholder="Working Hours"
                value={newOrg.working_hours}
                onChange={(e) => setNewOrg({ ...newOrg, working_hours: e.target.value })}
                className="border rounded p-2 flex-grow mr-2"
                required
              />
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap">
                Add Org              </button>
            </div>
          </form>

          {/* Organizations Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 sm:px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('organizations', 'name')}>
                    Name {sorting.organizations.field === 'name' && (
                      sorting.organizations.direction === 'asc' ? <FaSortAmountUp className="inline ml-1" /> : <FaSortAmountDown className="inline ml-1" />
                    )}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left">Email</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left">Phone</th>
                  <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left">Location</th>
                  <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left">Working Hours</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  organizations.map(org => (
                    <tr key={org.id} className="border-b hover:bg-gray-100">
                      <td className="px-4 sm:px-6 py-4 font-medium">
                        {editingOrg?.id === org.id ? (
                          <>
                            <input
                              type="text"
                              value={editingOrg.name}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('name', value);
                                setEditingOrg({ ...editingOrg, name: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.name.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.name.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.name.message}</p>
                            )}
                          </>
                        ) : org.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {editingOrg?.id === org.id ? (
                          <>
                            <input
                              type="email"
                              value={editingOrg.email}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('email', value);
                                setEditingOrg({ ...editingOrg, email: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.email.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.email.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.email.message}</p>
                            )}
                          </>
                        ) : org.email}
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                        {editingOrg?.id === org.id ? (
                          <>
                            <input
                              type="text"
                              value={editingOrg.phone_number}
                              onChange={(e) => {
                                const value = e.target.value;
                                validateInput('phone', value);
                                setEditingOrg({ ...editingOrg, phone_number: value });
                              }}
                              className={`border rounded p-1 w-full ${!inputValidation.phone.valid ? 'border-red-500' : ''}`}
                            />
                            {!inputValidation.phone.valid && (
                              <p className="text-red-500 text-xs mt-1">{inputValidation.phone.message}</p>
                            )}
                          </>
                        ) : org.phone_number}
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        {editingOrg?.id === org.id ? (
                          <input
                            type="text"
                            value={editingOrg.location || ''}
                            onChange={(e) => setEditingOrg({ ...editingOrg, location: e.target.value })}
                            className="border rounded p-1 w-full"
                          />
                        ) : org.location}
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        {editingOrg?.id === org.id ? (
                          <input
                            type="text"
                            value={editingOrg.working_hours}
                            onChange={(e) => setEditingOrg({ ...editingOrg, working_hours: e.target.value })}
                            className="border rounded p-1 w-full"
                          />
                        ) : org.working_hours}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {editingOrg?.id === org.id ? (
                          <select
                            value={editingOrg.is_active}
                            onChange={(e) => setEditingOrg({ ...editingOrg, is_active: parseInt(e.target.value) })}
                            className="border rounded p-1"
                          >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                          </select>
                        ) : (
                          <span className={org.is_active === 1 || org.is_active === true ? 'text-green-500' : 'text-red-500 font-bold'}>
                            {org.is_active === 1 || org.is_active === true ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex space-x-2">
                          {editingOrg?.id === org.id ? (
                            <>
                              <button
                                onClick={() => handleOrgAction('update', org.id, editingOrg)}
                                className="text-green-500 hover:text-green-700"
                                title="Save changes"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => setEditingOrg(null)}
                                className="text-red-500 hover:text-red-700"
                                title="Cancel"
                              >
                                <FaTimes />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingOrg({ ...org })}
                                className="text-blue-500 hover:text-blue-700"
                                title="Edit organization"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => setShowPasswordModal({ show: true, type: 'organization', id: org.id, entity: org })}
                                className="text-yellow-500 hover:text-yellow-700"
                                title="Change password"
                              >
                                <FaKey />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm({ show: true, type: 'org', id: org.id })}
                                className="text-red-500 hover:text-red-700"
                                title="Delete organization"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Enhanced debug info */}
            <div className="mt-4 p-3 text-sm text-gray-700 bg-gray-100 rounded border border-gray-300">
              <strong>Debug Info:</strong> 
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div>Total organizations: <span className="font-bold">{organizations.length}</span></div>
                <div>Active: <span className="font-bold text-green-600">{organizations.filter(org => org.is_active === 1 || org.is_active === true).length}</span></div>
                <div>Inactive: <span className="font-bold text-red-600">{organizations.filter(org => 
                  org.is_active === 0 || 
                  org.is_active === false || 
                  org.is_active === null || 
                  org.is_active === undefined
                ).length}</span></div>
                <div>Inactive IDs: {organizations.filter(org => 
                  org.is_active === 0 || 
                  org.is_active === false || 
                  org.is_active === null || 
                  org.is_active === undefined
                ).map(org => org.id).join(', ')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Confirm Delete</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete this {showDeleteConfirm.type}?</p>
            <p className="text-sm text-red-500 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm({ show: false, type: '', id: null })}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm.type === 'user') {
                    handleUserAction('delete', showDeleteConfirm.id);
                  } else {
                    handleOrgAction('delete', showDeleteConfirm.id);
                  }
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
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

      {/* Password Change Modal */}
      {showPasswordModal.show && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/70 to-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              Change Password for {showPasswordModal.entity?.name || showPasswordModal.type}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordError && (
                <div className="text-red-500 text-sm flex items-center">
                  <FaExclamationTriangle className="mr-1" /> {passwordError}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowPasswordModal({ show: false, type: '', id: null, entity: null });
                  setPasswordData({ password: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={applyPasswordChange}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 