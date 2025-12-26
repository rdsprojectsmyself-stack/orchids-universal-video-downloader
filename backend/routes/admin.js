const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, isAdmin, adminController.getStats);
router.get('/activity', verifyToken, isAdmin, adminController.getRecentActivity);

module.exports = router;
