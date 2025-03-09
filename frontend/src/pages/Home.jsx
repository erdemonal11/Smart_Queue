import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { 
  FaUserPlus, 
  FaBuilding, 
  FaSignInAlt, 
  FaClock, 
  FaQrcode,
  FaComments,
  FaCalendarCheck,
  FaShieldAlt,
  FaDownload,
  FaGraduationCap,
  FaUniversity,
  FaUsers,
  FaCheckCircle,
  FaBars,
  FaTimes,
  FaArrowRight,
  FaDatabase,
  FaReact,
  FaNode,
  FaCss3Alt,
  FaKey,
  FaMobile,
  FaServer,
  FaNetworkWired,
  FaCode,
  FaBell,
  FaUserLock,
  FaEnvelope,
  FaChartBar,
  FaLock,
  FaSync
} from 'react-icons/fa';
import { SiPostgresql, SiJsonwebtokens, SiTailwindcss } from 'react-icons/si';
import { BiMessageDetail } from 'react-icons/bi';

const Home = () => {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      
      window.location.replace(dashboardPath);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Responsive Navigation */}
      <nav className="bg-white shadow-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src="/queue.png" alt="SmartQueue Logo" className="h-8 w-8 mr-2 transform transition-transform hover:scale-110" />
                <span className="text-xl md:text-2xl font-bold text-indigo-600">SmartQueue</span>
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-indigo-600 focus:outline-none"
              >
                {isMenuOpen ? (
                  <FaTimes className="h-6 w-6" />
                ) : (
                  <FaBars className="h-6 w-6" />
                )}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition duration-300">
                <FaSignInAlt className="mr-2" /> Login
              </Link>
              <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center transition duration-300 transform hover:scale-105">
                <FaUserPlus className="mr-2" /> Register
              </Link>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/login" className="text-gray-700 hover:text-indigo-600 block px-3 py-2 rounded-md text-base font-medium">
                <FaSignInAlt className="inline mr-2" /> Login
              </Link>
              <Link to="/register" className="bg-indigo-600 text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-indigo-700">
                <FaUserPlus className="inline mr-2" /> Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with enhanced content */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-6">
              <img src="/queue.png" alt="SmartQueue Logo" className="h-16 w-16 transform transition-all duration-500 hover:scale-110 filter hover:brightness-110" />
              <h2 className="text-lg font-semibold text-gray-600">Işık University Graduation Project 2025</h2>
            </div>
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Smart Queue Management</span>
              <span className="block text-indigo-600">for Modern Organizations</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A web-based queue management system that streamlines appointment booking and queue management for organizations.
            </p>
            
            {/* Queue Animation with Explanation */}
            <div className="w-full max-w-4xl mx-auto my-12">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">FIFO Queue Visualization</h3>
                <img 
                  src="https://www.srdrylmz.com/wp-content/uploads/2017/04/kuyruk.gif" 
                  alt="Queue Animation" 
                  className="w-full rounded-lg shadow-lg mb-6"
                />
                <div className="text-left max-w-3xl mx-auto">
                  <h4 className="text-lg font-semibold text-indigo-600 mb-3">How Our Queue System Works</h4>
                  <p className="text-gray-600 mb-4">
                    SmartQueue implements a First-In-First-Out (FIFO) queue system, ensuring fair and efficient service delivery:
                  </p>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <FaArrowRight className="h-5 w-5 text-indigo-500 mt-1 mr-2" />
                      <span>Users join the queue by booking appointments, receiving a unique queue number</span>
                    </li>
                    <li className="flex items-start">
                      <FaArrowRight className="h-5 w-5 text-indigo-500 mt-1 mr-2" />
                      <span>Queue positions update automatically when users are served or bookings are canceled</span>
                    </li>
                    <li className="flex items-start">
                      <FaArrowRight className="h-5 w-5 text-indigo-500 mt-1 mr-2" />
                      <span>QR code validation ensures secure and efficient check-in process</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Enhanced Technology Stack Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Built with Modern Technology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Frontend Stack */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6">
                  <div className="flex flex-col items-center mb-6">
                    <FaCode className="h-8 w-8 text-indigo-600 mb-2" />
                    <h4 className="text-xl font-semibold text-indigo-600">Frontend</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <FaReact className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">React.js</h5>
                        <p className="text-sm text-gray-600">Modern Hooks & Components</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <SiTailwindcss className="h-6 w-6 text-cyan-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">Tailwind CSS</h5>
                        <p className="text-sm text-gray-600">Responsive Design System</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <FaNetworkWired className="h-6 w-6 text-red-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">React Router</h5>
                        <p className="text-sm text-gray-600">Dynamic Navigation & Routing</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <FaQrcode className="h-6 w-6 text-gray-700 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">QR Integration</h5>
                        <p className="text-sm text-gray-600">Generation & Scanning</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Backend Stack */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6">
                  <div className="flex flex-col items-center mb-6">
                    <FaServer className="h-8 w-8 text-indigo-600 mb-2" />
                    <h4 className="text-xl font-semibold text-indigo-600">Backend</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <FaNode className="h-6 w-6 text-green-600 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">Node.js & Express</h5>
                        <p className="text-sm text-gray-600">Server Runtime & Framework</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <SiPostgresql className="h-6 w-6 text-blue-400 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">PostgreSQL</h5>
                        <p className="text-sm text-gray-600">Relational Database</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <SiJsonwebtokens className="h-6 w-6 text-pink-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">JWT Auth</h5>
                        <p className="text-sm text-gray-600">Secure Authentication</p>
                      </div>
                    </div>
                    <div className="flex items-start bg-white p-4 rounded-lg shadow-sm">
                      <FaNetworkWired className="h-6 w-6 text-indigo-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-semibold">RESTful API</h5>
                        <p className="text-sm text-gray-600">Modern API Design</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="text-indigo-600 mb-4">
                  <FaCalendarCheck className="h-10 w-10 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Appointment Booking</h3>
                <p className="text-gray-600">Book appointments with organizations and receive queue numbers automatically</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="text-indigo-600 mb-4">
                  <FaQrcode className="h-10 w-10 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">QR Code Check-in</h3>
                <p className="text-gray-600">Generate and scan QR codes for quick and secure check-in process</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
                <div className="text-indigo-600 mb-4">
                  <FaComments className="h-10 w-10 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Direct Messaging</h3>
                <p className="text-gray-600">Communicate directly with organizations for your active bookings</p>
              </div>
            </div>

            {/* User and Organization Benefits */}
            <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 max-w-5xl mx-auto">
              {/* For Users */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition duration-300">
                <div className="text-indigo-600 mb-4">
                  <FaUsers className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">For Users</h3>
                <ul className="space-y-4 text-left mb-6">
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Book appointments and manage your queue position</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Generate QR codes for quick check-in</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Message organizations about your bookings</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Download your booking history and data</span>
                  </li>
                </ul>
              </div>

              {/* For Organizations */}
              <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition duration-300">
                <div className="text-indigo-600 mb-4">
                  <FaBuilding className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">For Organizations</h3>
                <ul className="space-y-4 text-left mb-6">
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Manage appointments and queue flow efficiently</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Scan and validate user QR codes</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Communicate with booked users directly</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                    <span>Access booking analytics and reports</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Enhanced System Architecture Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 my-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">System Architecture</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="text-center p-4">
                  <FaUsers className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">User Layer</h4>
                  <p className="text-gray-600 text-sm">Intuitive interfaces for users and organizations with real-time updates</p>
                </div>
                <div className="text-center p-4">
                  <FaShieldAlt className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Security Layer</h4>
                  <p className="text-gray-600 text-sm">Role-based access control and secure data transmission</p>
                </div>
                <div className="text-center p-4">
                  <FaDatabase className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">Data Layer</h4>
                  <p className="text-gray-600 text-sm">Optimized database design with efficient querying</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">System Features</h2>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* User & Organization Management */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <FaUserLock className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">User & Organization Management</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Secure authentication for users and organizations</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Role-Based Access Control (RBAC)</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Data export in JSON/CSV format</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Queue & Booking System */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <FaClock className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Queue & Booking System</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Time slot-based appointment booking</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Automatic queue number assignment</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">QR code generation and validation</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Messaging System */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <BiMessageDetail className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Messaging System</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Direct messaging for active bookings</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Automatic system messages on cancellation</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Booking-specific communication channels</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Notifications & Security */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <FaShieldAlt className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Security</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">JWT-based authentication</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Role-based access control</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Secure QR code validation</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Database & Performance */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <FaDatabase className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Database & Performance</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">PostgreSQL database integration</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Structured data relationships</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Efficient data storage</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Management */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-8 hover:shadow-lg transition duration-300">
                <div className="flex items-start space-x-4">
                  <FaDownload className="h-8 w-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Data export in JSON/CSV formats</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">Booking history tracking</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheckCircle className="h-5 w-5 text-green-500 mt-1 mr-3" />
                        <span className="text-gray-600">User data management</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center mb-4">
                <img src="/queue.png" alt="SmartQueue Logo" className="h-8 w-8 mr-2" />
                <span className="text-xl font-bold text-indigo-600">SmartQueue</span>
              </div>
              <p className="text-gray-500 text-sm text-center md:text-left">
                A modern solution for queue management
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end">
              <div className="flex items-center mb-4">
                <FaGraduationCap className="h-6 w-6 text-indigo-600 mr-2" />
                <span className="text-gray-600">Graduation Project 2025</span>
              </div>
              <div className="flex items-center">
                <FaUniversity className="h-6 w-6 text-indigo-600 mr-2" />
                <span className="text-gray-600">Işık University</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 