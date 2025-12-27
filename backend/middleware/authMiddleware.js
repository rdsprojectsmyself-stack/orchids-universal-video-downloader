const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-in-prod';

const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer token)
    // Also check x-access-token for backward compatibility
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Authorization token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      
      // Provide specific error messages for different JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Your session has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'Authentication token is invalid',
          code: 'TOKEN_INVALID'
        });
      } else {
        return res.status(401).json({ 
          error: 'Token verification failed',
          message: 'Could not verify authentication token',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    }

    console.log('Token verified successfully for user ID:', decoded.id);
    
    // Find user in database
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    
    if (!user) {
      console.error('User not found for token:', decoded.id);
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The user associated with this token no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    // Attach user info to request object
    req.user = user;
    req.userId = decoded.id;
    
    next();
  } catch (error) {
    console.error('Unexpected error in token verification:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication'
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { verifyToken, isAdmin };
