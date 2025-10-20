const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/mailer');
const crypto = require('crypto'); 

// POST /api/auth/register
router.post('/register', async (req, res, next) => { 
    console.log('💡 Body recibido:', req.body);
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        let userRole = 'user';
        if (email === process.env.ADMIN_EMAIL) {
            userRole = 'admin';
        }

        // 🔹 Insertar usuario directamente como verificado
        const sql = `
            INSERT INTO Users (full_name, email, password_hash, role, verified)
            VALUES (?, ?, ?, ?, 'verified')
        `;
        const [result] = await db.query(sql, [fullName, email, passwordHash, userRole]);

        // 🔹 (Omitimos generación de token y envío de correo)
        console.log(`✅ Usuario registrado y verificado automáticamente: ${email}`);

        res.status(201).json({ 
            message: 'Usuario registrado y verificado exitosamente.',
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
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        if (user.status !== 'verified') {
            return res.status(403).json({ message: 'Tu cuenta no ha sido verificada. Por favor, revisa tu correo electrónico.' });
        }

        // Token válido por 7 días
        const payload = { userId: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Fecha de expiración (1 semana)
        const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.query('UPDATE Users SET verification_token = ?, token_expiry = ? WHERE id = ?', [token, expiry, user.id]);

        // Cookie HttpOnly válida por 7 días
        res.cookie('sessionToken', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
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

// GET /api/auth/me
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

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).send('<h1>Error</h1><p>Token de verificación no proporcionado.</p>');
        }

        const sql = "SELECT * FROM Users WHERE verification_token = ? AND token_expiry > NOW() AND status = 'unverified'";
        const [users] = await db.query(sql, [token]);
        if (users.length === 0) {
            return res.status(400).send('<h1>Error</h1><p>El token es inválido, ha expirado o la cuenta ya fue verificada. Por favor, intenta registrarte de nuevo.</p>');
        }

        const user = users[0];
        await db.query(
            "UPDATE Users SET status = 'verified', verification_token = NULL, token_expiry = NULL WHERE id = ?",
            [user.id]
        );

        res.send('<h1>¡Correo verificado exitosamente! ✅</h1><p>Ya puedes cerrar esta ventana e iniciar sesión en Academia Books.</p>');

    } catch (error) {
        next(error);
    }
});

module.exports = router;
