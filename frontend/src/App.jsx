import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import { useEffect, useState, useRef } from 'react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Immediate redirect component to prevent home page flash
const HomeRedirect = () => {
  const [loading, setLoading] = useState(true);
  
  // Use a ref to track if we've already redirected
  const hasRedirected = useRef(false);
  
  // Redirect immediately on component mount
  useEffect(() => {
    if (hasRedirected.current) return;
    
    const token = localStorage.getItem('token');
    if (token) {
      hasRedirected.current = true;
      const role = localStorage.getItem('role');
      let dashboardPath = '/login';
      
      if (role === 'admin') {
        dashboardPath = '/dashboard/admin';
      } else if (role === 'organization') {
        dashboardPath = '/dashboard/organization';
      } else if (role === 'user') {
        dashboardPath = '/dashboard/user';
      }
      
      // Use window.location for hard redirect to prevent any flashing
      window.location.replace(dashboardPath);
    } else {
      setLoading(false);
    }
  }, []);
  
  // Add a second effect to handle any race conditions
  useEffect(() => {
    // Set up a timer to check again after a short delay
    const timer = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (token && !hasRedirected.current) {
        hasRedirected.current = true;
        const role = localStorage.getItem('role');
        let dashboardPath = '/login';
        
        if (role === 'admin') {
          dashboardPath = '/dashboard/admin';
        } else if (role === 'organization') {
          dashboardPath = '/dashboard/organization';
        } else if (role === 'user') {
          dashboardPath = '/dashboard/user';
        }
        
        window.location.replace(dashboardPath);
      }
    }, 50); // Check again after 50ms
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show absolutely nothing while checking auth status
  if (loading) {
    return (
      <div style={{ 
        display: 'none', 
        visibility: 'hidden',
        opacity: 0,
        position: 'absolute',
        pointerEvents: 'none'
      }}></div>
    );
  }
  
  // Only render Home component if not logged in
  return <Home />;
};

function App() {
  // Add global navigation blocker
  useEffect(() => {
    // Use a ref to track if we've already redirected
    const hasRedirected = { current: false };
    
    if (localStorage.getItem('token')) {
      const role = localStorage.getItem('role');
      
      const blockHomeAccess = () => {
        if (hasRedirected.current) return true;
        
        if (window.location.pathname === '/' || window.location.pathname === '') {
          hasRedirected.current = true;
          let dashboardPath = '/login';
          
          if (role === 'admin') {
            dashboardPath = '/dashboard/admin';
          } else if (role === 'organization') {
            dashboardPath = '/dashboard/organization';
          } else if (role === 'user') {
            dashboardPath = '/dashboard/user';
          }
          
          console.log('BLOCKING HOME ACCESS - REDIRECTING TO:', dashboardPath);
          window.location.replace(dashboardPath); // Using replace instead of href
          return true;
        }
        return false;
      };
      
      // Check on initial load
      blockHomeAccess();
      
      // Add event listeners for all possible navigation events
      window.addEventListener('popstate', blockHomeAccess);
      window.addEventListener('hashchange', blockHomeAccess);
      window.addEventListener('load', blockHomeAccess);
      
      // Add click listener to catch navigation attempts
      document.addEventListener('click', (e) => {
        // Check if clicked element is a link to home
        if (e.target.tagName === 'A' && (e.target.pathname === '/' || e.target.href.endsWith('/'))) {
          e.preventDefault();
          blockHomeAccess();
        }
      }, true);
      
      // Create a MutationObserver to watch for URL changes
      const observer = new MutationObserver(() => {
        if (window.location.pathname === '/' || window.location.pathname === '') {
          blockHomeAccess();
        }
      });
      
      // Start observing
      observer.observe(document, { subtree: true, childList: true });
      
      // Set up interval to periodically check URL (backup method)
      const intervalId = setInterval(() => {
        if (window.location.pathname === '/' || window.location.pathname === '') {
          blockHomeAccess();
        }
      }, 50);
      
      return () => {
        window.removeEventListener('popstate', blockHomeAccess);
        window.removeEventListener('hashchange', blockHomeAccess);
        window.removeEventListener('load', blockHomeAccess);
        document.removeEventListener('click', blockHomeAccess, true);
        observer.disconnect();
        clearInterval(intervalId);
      };
    }
  }, []);

  // Function to redirect based on user role
  const getRedirectPath = (user) => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'organization':
        return '/dashboard/organization';
      case 'user':
        return '/dashboard/user';
      default:
        return '/login';
    }
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - Use HomeRedirect instead of Home */}
          <Route
            path="/"
            element={<HomeRedirect />}
          />
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/register"
            element={<Register />}
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard/user"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/organization"
            element={
              <ProtectedRoute allowedRoles={['organization']}>
                <OrganizationDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
