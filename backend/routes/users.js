const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Ruta: GET /api/users/me (Obtener perfil del usuario logueado)
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const sql = 'SELECT id, full_name, email, role FROM Users WHERE id = ?';
        const [users] = await db.query(sql, [req.user.userId]);
        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        }
    } catch (error) {
        next(error);
    }
});

// Ruta: GET /api/users/:id (Obtener usuario por ID)
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT id, full_name, email, role FROM Users WHERE id = ?';
        const [users] = await db.query(sql, [id]);
        
        if (users.length > 0) {
            res.status(200).json(users[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        }
    } catch (error) {
        next(error);
    }
});


// Ruta: GET /api/users (Obtener todos los usuarios - Solo Admin)
router.get('/', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const sql = 'SELECT id, full_name, email, role FROM Users';
        const [users] = await db.query(sql);
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
});

// Ruta: PATCH /api/users/:id/role (Actualizar rol - Solo Admin)
router.patch('/:id/role', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (role !== 'admin' && role !== 'user') {
            return res.status(400).json({ message: 'Rol no válido.' });
        }
        
        const sql = 'UPDATE Users SET role = ? WHERE id = ?';
        await db.query(sql, [role, id]);
        res.status(200).json({ message: 'Rol de usuario actualizado.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

