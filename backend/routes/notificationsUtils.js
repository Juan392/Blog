const db = require('../config/db');

async function createNotification(userId, senderId, message, type, relatedId = null) {
    try {
        const sql = `
            INSERT INTO Notifications (user_id, sender_id, message, type, related_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.query(sql, [userId, senderId, message, type, relatedId]);
    } catch (error) {
        console.error('Error al crear notificación:', error);
    }
}

module.exports = { createNotification };
