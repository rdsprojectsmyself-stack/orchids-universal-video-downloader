const rateLimit = require('express-rate-limit');

// Strict rate limiting for guest users (IP-based)
const guestDownloadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 downloads per hour for guests
    message: {
        error: 'Download limit reached. Sign in for unlimited downloads.',
        requiresAuth: true
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use IP address for rate limiting
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    },
    skip: (req) => {
        // Skip rate limiting if user is authenticated
        return !!req.user;
    }
});

module.exports = { guestDownloadLimiter };
