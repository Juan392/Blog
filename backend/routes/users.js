const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// -------------------- CONFIG MULTER --------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// -------------------- RUTAS USUARIO --------------------

// GET perfil del usuario
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    console.log(`Solicitud GET /me para usuario ID: ${req.user.userId}`);
    const sql = 'SELECT id, full_name, email, role, profile_pic FROM Users WHERE id = ?';
    const [users] = await db.query(sql, [req.user.userId]);
    if (users.length === 0) {
      console.log('Usuario no encontrado en la base de datos.');
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    console.log('Perfil de usuario enviado:', users[0]);
    res.json(users[0]);
  } catch (err) {
    console.error('Error en GET /me:', err);
    next(err);
  }
});

// PATCH actualizar datos del usuario (nombre, email y contraseña)
router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    console.log('Solicitud PATCH /me recibida:', req.body);
    const { full_name, email, password, current_password } = req.body || {};

    if (!full_name || !email) {
      console.log('Error: full_name y email son obligatorios. Solicitud recibida:', req.body);
      return res.status(400).json({ message: 'full_name y email son obligatorios.' });
    }

    const userId = req.user.userId;

    if (password) {
      console.log('Verificando contraseña actual para usuario ID:', userId);
      const [users] = await db.query('SELECT password_hash FROM Users WHERE id = ?', [userId]);
      if (users.length === 0) {
        console.log('Usuario no encontrado para actualización de contraseña.');
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const match = await bcrypt.compare(current_password, users[0].password_hash);
      if (!match) {
        console.log('Contraseña actual incorrecta para usuario ID:', userId);
        return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query('UPDATE Users SET full_name = ?, email = ?, password_hash = ? WHERE id = ?', 
        [full_name, email, hashedPassword, userId]);
      console.log('Usuario actualizado exitosamente con nueva contraseña para ID:', userId);
    } else {
      await db.query('UPDATE Users SET full_name = ?, email = ? WHERE id = ?', [full_name, email, userId]);
      console.log('Usuario actualizado exitosamente sin contraseña para ID:', userId);
    }

    res.status(200).json({ message: 'Datos actualizados exitosamente.' });
  } catch (err) {
    console.error('Error en PATCH /me:', err);
    next(err);
  }
});

// PATCH subir imagen de perfil
router.patch('/me/profile-pic', authenticateToken, upload.single('profile_pic'), async (req, res, next) => {
  try {
    console.log('Solicitud PATCH /me/profile-pic recibida:', req.body, req.file);
    if (!req.file) {
      console.log('Error: No se subió ninguna imagen.');
      return res.status(400).json({ message: 'No se subió ninguna imagen.' });
    }

    const profilePicPath = `/uploads/${req.file.filename}`;
    const userId = req.user.userId;

    await db.query('UPDATE Users SET profile_pic = ? WHERE id = ?', [profilePicPath, userId]);
    console.log('Imagen de perfil actualizada para usuario ID:', userId, 'Nueva ruta:', profilePicPath);

    res.status(200).json({ message: 'Imagen de perfil actualizada.', profile_pic: profilePicPath });
  } catch (err) {
    console.error('Error en PATCH /me/profile-pic:', err);
    next(err);
  }
});

// GET actividad del usuario
router.get('/me/activity', authenticateToken, async (req, res, next) => {
  try {
  
    const userId = req.user.userId;
    const [comments] = await db.query('SELECT * FROM Comments WHERE user_id = ?', [userId]);
    const [books] = await db.query('SELECT * FROM Books WHERE uploader_id = ?', [userId]);
    res.status(200).json({ comments, books });
  } catch (err) {
    next(err);
  }
});

// GET usuario por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [users] = await db.query('SELECT id, full_name, email, role, profile_pic FROM Users WHERE id = ?', [id]);
    if (users.length === 0) {
      console.log('Usuario no encontrado para ID:', id);
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    console.log('Usuario enviado:', users[0]);
    res.json(users[0]);
  } catch (err) {
    console.error('Error en GET /:id:', err);
    next(err);
  }
});

// GET todos los usuarios (solo admin)
router.get('/', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const [users] = await db.query('SELECT id, full_name, email, role, profile_pic FROM Users');
    res.json(users);
  } catch (err) {
    console.error('Error en GET /:', err);
    next(err);
  }
});

// PATCH actualizar rol (solo admin)
router.patch('/:id/role', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol no válido.' });
    }

    await db.query('UPDATE Users SET role = ? WHERE id = ?', [role, id]);
    res.status(200).json({ message: 'Rol de usuario actualizado.' });
  } catch (err) {
    next(err);
  }
});

// POST subir libros
router.post('/books', authenticateToken, async (req, res, next) => {
  try {
    const { title, author, synopsis, pdf_link, external_link } = req.body;
    const userId = req.user.userId;

    await db.query(
      'INSERT INTO Books (title, author, synopsis, pdf_link, external_link, uploader_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, author, synopsis, pdf_link, external_link, userId]
    );
    res.status(201).json({ message: 'Libro subido exitosamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
