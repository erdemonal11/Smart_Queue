import { FaHome } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600">404</h1>
        <h2 className="text-3xl font-extrabold text-gray-900 mt-4">Page Not Found</h2>
        <p className="mt-2 text-lg text-gray-600">The page you are looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaHome className="mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 