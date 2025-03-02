const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is organization
const isOrganization = (req, res, next) => {
  if (req.user && req.user.role === 'organization') {
    next();
  } else {
    res.status(403).json({ message: 'Organization access required' });
  }
};

// Middleware to check if user is accessing their own profile
const isOwnProfile = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.id === parseInt(req.params.id)) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied' });
  }
};

// Middleware to check if user is organization and accessing their own profile
const isOwnOrganization = (req, res, next) => {
  if (req.user.role === 'admin' || 
      (req.user.role === 'organization' && req.user.id === parseInt(req.params.id))) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied' });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isOrganization,
  isOwnProfile,
  isOwnOrganization
}; 