import { useContext, useEffect, useRef } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);

  const getDashboardPath = (role) => {
    switch (role) {
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

  // Force redirect from home page - AGGRESSIVE VERSION
  useEffect(() => {
    if (user) {
      const dashboardPath = getDashboardPath(user.role);
      
      // Block access to home page with hard redirect
      if (location.pathname === '/' || location.pathname === '') {
        console.log('HOME PAGE DETECTED - REDIRECTING TO:', dashboardPath);
        redirectAttempted.current = true;
        // Use replace for immediate redirect without adding to history
        window.location.replace(dashboardPath);
      }
    }
  }, [user, location.pathname, navigate]);

  // Add global event listener to catch all navigation attempts - ENHANCED VERSION
  useEffect(() => {
    if (user) {
      const dashboardPath = getDashboardPath(user.role);
      
      const blockHomeNavigation = () => {
        if (window.location.pathname === '/' || window.location.pathname === '') {
          console.log('NAVIGATION TO HOME BLOCKED - REDIRECTING TO:', dashboardPath);
          redirectAttempted.current = true;
          window.location.replace(dashboardPath);
          return true;
        }
        return false;
      };
      
      // Block initial load if needed
      blockHomeNavigation();
      
      // Add event listeners for all possible navigation events
      window.addEventListener('popstate', blockHomeNavigation);
      window.addEventListener('hashchange', blockHomeNavigation);
      window.addEventListener('load', blockHomeNavigation);
      document.addEventListener('click', (e) => {
        // Check if clicked element is a link to home
        if (e.target.tagName === 'A' && (e.target.pathname === '/' || e.target.href.endsWith('/'))) {
          e.preventDefault();
          blockHomeNavigation();
        }
      }, true);
      
      // Create a MutationObserver to watch for URL changes
      const observer = new MutationObserver(() => {
        if (window.location.pathname === '/' || window.location.pathname === '') {
          blockHomeNavigation();
        }
      });
      
      // Start observing
      observer.observe(document, { subtree: true, childList: true });
      
      // Set up interval to periodically check URL (backup method)
      const intervalId = setInterval(() => {
        if (window.location.pathname === '/' || window.location.pathname === '') {
          blockHomeNavigation();
        }
      }, 100);
      
      return () => {
        window.removeEventListener('popstate', blockHomeNavigation);
        window.removeEventListener('hashchange', blockHomeNavigation);
        window.removeEventListener('load', blockHomeNavigation);
        document.removeEventListener('click', blockHomeNavigation, true);
        observer.disconnect();
        clearInterval(intervalId);
      };
    }
  }, [user]);

  // If user is not logged in, redirect to login
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }

  // If user is trying to access home page, redirect to their dashboard
  if (location.pathname === '/' || location.pathname === '') {
    if (!redirectAttempted.current) {
      console.log('FINAL HOME CHECK - REDIRECTING');
      const dashboardPath = getDashboardPath(user.role);
      redirectAttempted.current = true;
      window.location.replace(dashboardPath); // Force hard redirect
    }
    return null;
  }

  // If roles are specified and user's role is not allowed, redirect to their dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

export default ProtectedRoute; 