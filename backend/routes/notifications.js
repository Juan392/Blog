const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const sql = `
            SELECT id, message, created_at, is_read
            FROM Notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;
        const [notifications] = await db.query(sql, [req.user.userId]);
        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

router.put('/:id/read', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = 'UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
        const [result] = await db.query(sql, [id, req.user.userId]);

        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'Notificación no encontrada o no autorizada.' });

        res.json({ message: 'Notificación marcada como leída.' });
    } catch (error) {
        next(error);
    }
});


module.exports = router;

