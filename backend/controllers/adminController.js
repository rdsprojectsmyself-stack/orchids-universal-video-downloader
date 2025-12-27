const { getDB } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const db = getDB();
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const downloadCount = db.prepare('SELECT COUNT(*) as count FROM downloads').get();
        
        res.json({
            users: userCount.count,
            downloads: downloadCount.count
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const db = getDB();
        const recentDownloads = db.prepare(`
      SELECT d.*, u.email 
      FROM downloads d 
      JOIN users u ON d.userId = u.id 
      ORDER BY d.createdAt DESC 
      LIMIT 10
    `).all();

        res.json(recentDownloads);
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
};
