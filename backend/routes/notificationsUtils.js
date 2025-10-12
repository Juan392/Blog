
const db = require('../config/db');

async function createNotification(userId, message) {
    try {
        const sql = 'INSERT INTO Notifications (user_id, message) VALUES (?, ?)';
        await db.query(sql, [userId, message]);
    } catch (error) {
        console.error('Error al crear notificación:', error);
    }
}

module.exports = { createNotification };