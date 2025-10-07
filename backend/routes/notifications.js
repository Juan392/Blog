const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Ruta: GET /api/notifications/
router.get('/', authenticateToken, async (req, res, next) => { 
    try {
        const sql = 'SELECT * FROM Notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC';
        const [notifications] = await db.query(sql, [req.user.userId]);
        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

module.exports = router;