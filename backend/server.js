const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const organizationRoutes = require('./routes/organizationRoutes');

// Route middleware
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizations', organizationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SmartQueue API' });
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database tables
    await db.initDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 