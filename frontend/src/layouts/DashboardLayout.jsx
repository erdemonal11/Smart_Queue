import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUser, FaBuilding, FaShieldAlt } from 'react-icons/fa';
import { AuthContext } from '../App';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'user':
        return <FaUser className="h-6 w-6" />;
      case 'organization':
        return <FaBuilding className="h-6 w-6" />;
      case 'admin':
        return <FaShieldAlt className="h-6 w-6" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">SmartQueue</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-indigo-600">
                  {getRoleIcon()}
                </div>
                <span className="text-gray-700 font-medium capitalize">
                  {user?.name || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout; 