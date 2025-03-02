import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        // Parse the stored user data
        const userData = JSON.parse(storedUser);
        
        // Decode the token to get the user ID if it's not in the userData
        if (!userData.id && token) {
          const decodedToken = parseJwt(token);
          if (decodedToken && decodedToken.id) {
            userData.id = decodedToken.id;
            console.log('Extracted user ID from token:', decodedToken.id);
            // Update the stored user with the ID
            localStorage.setItem('user', JSON.stringify(userData));
          }
        }
        
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    // If the userData doesn't have an ID but has a token, extract the ID from the token
    if (!userData.id && userData.token) {
      const decodedToken = parseJwt(userData.token);
      if (decodedToken && decodedToken.id) {
        userData.id = decodedToken.id;
        console.log('Extracted user ID from token during login:', decodedToken.id);
      }
    }
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    localStorage.setItem('role', userData.role);
    console.log('User logged in:', userData.role, 'with ID:', userData.id);
  };

  const handleLogout = () => {
    // Clear user state
    setUser(null);
    
    // Clear all auth-related localStorage items
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    
    // Force clear any cached data that might be causing issues
    sessionStorage.clear();
    
    // Add a small delay to ensure state is updated before any navigation occurs
    setTimeout(() => {
      console.log('User logged out, all auth data cleared');
      
      // Force reload the page to clear any lingering state
      window.location.href = '/login';
    }, 100);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 