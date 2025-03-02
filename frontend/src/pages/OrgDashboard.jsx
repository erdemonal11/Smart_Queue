import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { FaClock, FaUserPlus, FaTimes, FaCheck, FaCog } from 'react-icons/fa';

const OrgDashboard = () => {
  const [currentQueues, setCurrentQueues] = useState([]);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', duration: '' });
  const [showServiceForm, setShowServiceForm] = useState(false);

  // Fetch current queues
  useEffect(() => {
    // TODO: Implement API call to fetch organization's current queues
    setCurrentQueues([
      {
        id: 1,
        user: 'John Doe',
        service: 'General Checkup',
        joinedAt: '10:30 AM',
        estimatedTime: '20 minutes',
        status: 'waiting'
      },
      {
        id: 2,
        user: 'Jane Smith',
        service: 'Blood Test',
        joinedAt: '10:45 AM',
        estimatedTime: '15 minutes',
        status: 'in-progress'
      }
    ]);
  }, []);

  // Fetch services
  useEffect(() => {
    // TODO: Implement API call to fetch organization's services
    setServices([
      { id: 1, name: 'General Checkup', duration: 30, isActive: true },
      { id: 2, name: 'Blood Test', duration: 20, isActive: true },
      { id: 3, name: 'Vaccination', duration: 15, isActive: false }
    ]);
  }, []);

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement API call to add new service
    setServices([
      ...services,
      {
        id: services.length + 1,
        name: newService.name,
        duration: parseInt(newService.duration),
        isActive: true
      }
    ]);
    setNewService({ name: '', duration: '' });
    setShowServiceForm(false);
  };

  const handleServiceToggle = (serviceId) => {
    // TODO: Implement API call to toggle service status
    setServices(services.map(service =>
      service.id === serviceId
        ? { ...service, isActive: !service.isActive }
        : service
    ));
  };

  const handleQueueAction = (queueId, action) => {
    // TODO: Implement API call to update queue status
    if (action === 'complete') {
      setCurrentQueues(currentQueues.filter(queue => queue.id !== queueId));
    } else if (action === 'cancel') {
      setCurrentQueues(currentQueues.filter(queue => queue.id !== queueId));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Current Queues Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Current Queues</h2>
          <div className="space-y-4">
            {currentQueues.map((queue) => (
              <div
                key={queue.id}
                className="border rounded-lg p-4 flex items-center justify-between bg-gray-50"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{queue.user}</h3>
                  <p className="text-gray-600">{queue.service}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <FaClock className="mr-2" />
                    <span>Joined: {queue.joinedAt} • Wait time: {queue.estimatedTime}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleQueueAction(queue.id, 'complete')}
                    className="p-2 text-green-600 hover:text-green-800"
                    title="Complete"
                  >
                    <FaCheck className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleQueueAction(queue.id, 'cancel')}
                    className="p-2 text-red-600 hover:text-red-800"
                    title="Cancel"
                  >
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {currentQueues.length === 0 && (
              <p className="text-gray-500 text-center py-4">No active queues</p>
            )}
          </div>
        </div>

        {/* Services Management Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Services</h2>
            <button
              onClick={() => setShowServiceForm(!showServiceForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <FaUserPlus className="mr-2" />
              Add Service
            </button>
          </div>

          {showServiceForm && (
            <form onSubmit={handleServiceSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
                    Service Name
                  </label>
                  <input
                    type="text"
                    id="serviceName"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-700">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="serviceDuration"
                    value={newService.duration}
                    onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                    required
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowServiceForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Service
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="border rounded-lg p-4 flex items-center justify-between bg-gray-50"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-gray-600">Duration: {service.duration} minutes</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-sm rounded-full ${
                    service.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleServiceToggle(service.id)}
                    className="p-2 text-gray-600 hover:text-gray-800"
                    title="Toggle Status"
                  >
                    <FaCog className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrgDashboard; 