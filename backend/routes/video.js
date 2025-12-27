const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middleware/authMiddleware');
const { guestDownloadLimiter } = require('../middleware/guestRateLimit');

// Public routes (no authentication required)
router.post('/validate', videoController.validateUrl);
router.post('/metadata', videoController.getMetadata);

// Guest download route (rate limited, no auth)
router.post('/download/guest', guestDownloadLimiter, videoController.downloadVideoGuest);

// Protected routes (authentication required)
router.post('/download', verifyToken, videoController.downloadVideo);
router.post('/trim', verifyToken, videoController.trimVideo);

module.exports = router;
