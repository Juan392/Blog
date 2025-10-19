const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res, next) => { 
    console.log('💡 Body recibido:', req.body);
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO Users (full_name, email, password_hash) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [fullName, email, passwordHash]);

        res.status(201).json({ 
            message: 'Usuario registrado con éxito.',
            userId: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }
        next(error);
    }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
        }

        const sql = 'SELECT * FROM Users WHERE email = ?';
        const [users] = await db.query(sql, [email]);
        if (users.length === 0) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'Credenciales inválidas.' });

        // Generar token
        const payload = { userId: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Guardar token y expiración en DB
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
        await db.query('UPDATE Users SET verification_token = ?, token_expiry = ? WHERE id = ?', [token, expiry, user.id]);

        // Enviar cookie HTTP-only
        res.cookie('sessionToken', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000, // 1h en ms
            sameSite: 'Lax',
            secure: false, //process.env.NODE_ENV === 'production' // solo en HTTPS
            path: '/'
        });

        res.status(200).json({ message: 'Inicio de sesión exitoso.' });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('sessionToken');
    res.json({ message: 'Sesión cerrada.' });
});


// ✅ ==================== NUEVA RUTA: /me ====================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, role, profile_pic FROM Users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

    res.status(200).json(users[0]);
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ message: 'Error del servidor.' });
  }
});


module.exports = router;    