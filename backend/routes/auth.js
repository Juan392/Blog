const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// POST /api/auth/register
router.post('/register', async (req, res, next) => { 
        console.log('💡 Body recibido:', req.body);
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        // Encriptar contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const sql = 'INSERT INTO Users (full_name, email, password_hash) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [fullName, email, passwordHash]);

        // Generar token
        const payload = { userId: result.insertId, role: 'user' };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respuesta exitosa
        res.status(201).json({ 
            message: 'Usuario registrado con éxito.',
            userId: result.insertId,
            token
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

        // Buscar usuario
        const sql = 'SELECT * FROM Users WHERE email = ?';
        const [users] = await db.query(sql, [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];

        // Comparar contraseña
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Generar token
        const payload = { userId: user.id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Inicio de sesión exitoso.', token });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
