import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { 
  FaUserPlus, 
  FaBuilding, 
  FaSignInAlt, 
  FaClock, 
  FaCalendarAlt, 
  FaShieldAlt,
  FaBell,
  FaExclamationTriangle,
  FaCalendarTimes,
  FaLayerGroup,
  FaAmbulance,
  FaGraduationCap,
  FaUniversity
} from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Redirect if user is logged in
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
      
      console.log('HOME COMPONENT - REDIRECTING TO:', dashboardPath);
      window.location.replace(dashboardPath);
    }
  }, [navigate]);

  // Add a second effect with a timer as a backup
  useEffect(() => {
    const timer = setTimeout(() => {
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
        
        console.log('HOME COMPONENT TIMER - REDIRECTING TO:', dashboardPath);
        window.location.replace(dashboardPath);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-indigo-600">SmartQueue</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition duration-300">
                <FaSignInAlt className="mr-2" /> Login
              </Link>
              <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center transition duration-300 transform hover:scale-105">
                <FaUserPlus className="mr-2" /> Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-6">
            <img src="/queue.png" alt="SmartQueue Logo" className="h-16 w-16 animate-pulse" />
            <h2 className="text-lg font-semibold text-gray-600">Işık University Graduation Project 2025</h2>
          </div>
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Smart Queue Management</span>
            <span className="block text-indigo-600">for Modern Organizations</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Streamline your queuing system with our intuitive platform. Perfect for businesses, healthcare facilities, and organizations of all sizes.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/register" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition duration-300 transform hover:scale-105">
              Get Started
            </Link>
            <Link to="/login" className="ml-4 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 transition duration-300">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Key Features</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 transform hover:scale-105">
              <div className="text-indigo-600 mb-4">
                <FaClock className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Real-time Queue Updates</h3>
              <p className="mt-2 text-gray-500">
                Track your position in real-time and receive notifications when it's your turn.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 transform hover:scale-105">
              <div className="text-indigo-600 mb-4">
                <FaCalendarAlt className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Easy Scheduling</h3>
              <p className="mt-2 text-gray-500">
                Book appointments in advance and manage your time efficiently.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition duration-300 transform hover:scale-105">
              <div className="text-indigo-600 mb-4">
                <FaShieldAlt className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Secure & Reliable</h3>
              <p className="mt-2 text-gray-500">
                Your data is protected with enterprise-grade security measures.
              </p>
            </div>
          </div>
        </div>

        {/* Guidelines Section */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FaExclamationTriangle className="h-6 w-6 text-indigo-600 mr-2" />
            Queue System Guidelines
          </h2>
          <div className="space-y-6 text-gray-600">
            <div className="flex items-start space-x-3 hover:bg-indigo-50 p-3 rounded-lg transition duration-300">
              <FaCalendarTimes className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
              <p>Users can cancel their queue position up to 1 hour before their scheduled time. This helps maintain system efficiency and allows others to take available slots.</p>
            </div>
            
            <div className="flex items-start space-x-3 hover:bg-indigo-50 p-3 rounded-lg transition duration-300">
              <FaBuilding className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
              <p>Organizations reserve the right to cancel or reschedule appointments when necessary.</p>
            </div>
            
            <div className="flex items-start space-x-3 hover:bg-indigo-50 p-3 rounded-lg transition duration-300">
              <FaBell className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
              <p>Real-time notifications will be sent for any queue updates or changes, ensuring you're always informed about your position and estimated wait time.</p>
            </div>
            
            <div className="flex items-start space-x-3 hover:bg-indigo-50 p-3 rounded-lg transition duration-300">
              <FaLayerGroup className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
              <p>Multiple service categories can be queued simultaneously, allowing you to efficiently manage multiple appointments across different organizations.</p>
            </div>
            

          </div>

          {/* Project Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <FaGraduationCap className="h-5 w-5" />
              <span>Graduation Project 2025 • Işık University</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white mt-20 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src="/queue.png" alt="SmartQueue Logo" className="h-8 w-8 mr-2" />
              <span className="text-xl font-bold text-indigo-600">SmartQueue</span>
            </div>
            <div className="text-gray-500 text-sm">
              © 2025 SmartQueue. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 