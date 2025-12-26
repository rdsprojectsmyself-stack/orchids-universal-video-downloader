const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-in-prod';
const CLIENT_URL = process.env.CLIENT_URL || '/'; // client redirect after Google auth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Helper to generate JWT (adjust payload/expiry as desired)
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    provider: user.provider,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Local signup (email/password)
exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // require password for local signups
    if (!password || password.trim().length === 0) {
      return res.status(400).json({ error: 'PASSWORD_REQUIRED', message: 'Password is required for email signup.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'EMAIL_IN_USE', message: 'Email already in use.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashed,
      name: name || null,
      provider: 'local',
    });

    const token = generateToken(user);
    return res.status(201).json({ token, user: { id: user.id, email: user.email, provider: user.provider, name: user.name } });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  }
};

// Local login (email/password)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    // Only allow email/password login for users created with local provider
    if (user.provider !== 'local') {
      return res.status(403).json({ error: 'USE_GOOGLE', message: 'This account was created with Google Sign-In. Please use Google login.' });
    }

    if (!user.password) {
      // Shouldn't normally happen for provider === 'local', but handle gracefully
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, provider: user.provider, name: user.name } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  }
};

// Google login via idToken (used by frontend)
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'ID_TOKEN_REQUIRED', message: 'Google idToken is required' });
    }
    if (!googleClient) {
      console.error('GOOGLE_CLIENT_ID not configured');
      return res.status(500).json({ error: 'INTERNAL', message: 'Google client not configured' });
    }

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'NO_EMAIL', message: 'Google account did not return an email.' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || null;
    const avatar = payload.picture || null;

    let user = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { googleId },
        ],
      },
    });

    if (!user) {
      // Create a new Google user WITHOUT password
      user = await User.create({
        email,
        googleId,
        password: null,
        provider: 'google',
        name,
        avatar
      });
    } else {
      // attach googleId if missing
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        await user.save();
      }
    }

    const token = generateToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, provider: user.provider, name: user.name, avatar: user.avatar } });
  } catch (err) {
    console.error('Google login error', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  }
};

// Authenticated: get current user
exports.getMe = async (req, res) => {
  try {
    // verifyToken middleware should attach req.user
    const u = req.user;
    if (!u) {
      return res.status(401).json({ error: 'NOT_AUTHENTICATED', message: 'Not authenticated' });
    }
    // Return a minimal safe user object
    return res.json({ user: { id: u.id, email: u.email, provider: u.provider, name: u.name || null, avatar: u.avatar || null, isAdmin: !!u.isAdmin } });
  } catch (err) {
    console.error('getMe error', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  }
};

// Logout endpoint (stateless JWT - just respond OK)
exports.logout = async (req, res) => {
  try {
    // Optionally: add server-side token blacklist if you implement one.
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error', err);
    return res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
  }
};

// Keep the old oauth callback if used by other flows
exports.googleCallback = async (req, res) => {
  try {
    const googleProfile = req.user || req.body;
    const googleId = googleProfile.id || googleProfile.sub || googleProfile.googleId;
    const email = (googleProfile.emails && googleProfile.emails[0] && googleProfile.emails[0].value) || googleProfile.email;
    if (!email) {
      return res.status(400).json({ message: 'Google account did not return an email.' });
    }

    let user = await User.findOne({
      where: {
        [Op.or]: [{ email }, { googleId }]
      }
    });

    if (!user) {
      user = await User.create({
        email,
        googleId,
        password: null,
        provider: 'google',
      });
    } else if (!user.googleId && googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user);
    const redirectUrl = `${CLIENT_URL.replace(/\/$/, '')}/auth/success?token=${token}`;

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ token, user: { id: user.id, email: user.email, provider: user.provider } });
    }

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google callback error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
