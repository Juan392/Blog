const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const sharp = require('sharp');

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            req.fileError = 'Solo se permiten archivos de imagen.';
            cb(null, false);
        }
    }
});

// GET perfil del usuario
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const sql = 'SELECT id, full_name, email, role, profile_pic FROM Users WHERE id = ?';
    const [users] = await db.query(sql, [req.user.userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    // Log seguro
    if (process.env.NODE_ENV !== 'production') {
        console.log(`GET /me para usuario ID: ${req.user.userId}`);
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Error en GET /me'); // Sin exponer datos sensibles
    next(err);
  }
});

// PATCH actualizar datos del usuario (email y contraseña)
router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    const { email, password, current_password } = req.body || {};

    if (!email && !password) {
      return res.status(400).json({ message: 'Debes enviar al menos email o contraseña para actualizar.' });
    }

    const userId = req.user.userId;

    if (password) {
      if (!current_password) {
        return res.status(400).json({ message: 'Debes proporcionar la contraseña actual para cambiar la contraseña.' });
      }

      const [users] = await db.query('SELECT password_hash FROM Users WHERE id = ?', [userId]);
      if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

      const match = await bcrypt.compare(current_password, users[0].password_hash);
      if (!match) return res.status(400).json({ message: 'Contraseña actual incorrecta.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE Users SET email = COALESCE(?, email), password_hash = ? WHERE id = ?',
        [email, hashedPassword, userId]
      );

      if (process.env.NODE_ENV !== 'production') console.log(`Usuario ID ${userId} actualizado con nueva contraseña`);
    } else {
      await db.query(
        'UPDATE Users SET email = COALESCE(?, email) WHERE id = ?',
        [email, userId]
      );
      if (process.env.NODE_ENV !== 'production') console.log(`Usuario ID ${userId} actualizado sin cambiar contraseña`);
    }

    res.status(200).json({ message: 'Datos actualizados exitosamente.' });
  } catch (err) {
    console.error('Error en PATCH /me');
    next(err);
  }
});

router.patch('/me/profile-pic', authenticateToken, upload.single('profile_pic'), async (req, res, next) => {
    try {
        if (req.fileError) return res.status(400).json({ message: req.fileError });
        if (!req.file) return res.status(400).json({ message: 'No se subió ninguna imagen.' });

        const filename = `${req.user.userId}-${Date.now()}.webp`;
        const outputPath = path.join(__dirname, '../uploads', filename);

        await sharp(req.file.buffer)
            .resize({ width: 500, fit: 'inside' })
            .webp({ quality: 80 })
            .toFile(outputPath);

        const profilePicPath = `/uploads/${filename}`;
        await db.query('UPDATE Users SET profile_pic = ? WHERE id = ?', [profilePicPath, req.user.userId]);

        res.status(200).json({ message: 'Imagen de perfil actualizada.', profile_pic: profilePicPath });
    } catch (err) {
        console.error('Error en PATCH /me/profile-pic');
        next(err);
    }
});

// GET /api/users/me/activity
router.get('/me/activity', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const [comments] = await db.query(
            `SELECT 'comment' as type, id as related_id, book_id, content as details, created_at as date 
             FROM Comments WHERE user_id = ?`,
            [userId]
        );
        const [books] = await db.query(
            `SELECT 'book_upload' as type, id as related_id, id as book_id, title as details, created_at as date 
             FROM Books WHERE uploader_id = ?`, 
            [userId]
        );
        const allActivities = [...comments, ...books].sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalItems = allActivities.length;
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;
        const paginatedActivities = allActivities.slice(offset, offset + limit);
        res.json({
            activities: paginatedActivities,
            totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error('Error en GET /me/activity');
        next(error);
    }
});

// GET usuario por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [users] = await db.query('SELECT id, full_name, email, role, profile_pic FROM Users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    if (process.env.NODE_ENV !== 'production') console.log(`GET /users/:id para usuario ID: ${id}`);
    res.json(users[0]);
  } catch (err) {
    console.error('Error en GET /:id');
    next(err);
  }
});

// GET todos los usuarios (solo admin)
router.get('/', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const [users] = await db.query('SELECT id, full_name, email, role, profile_pic FROM Users');
    res.json(users);
  } catch (err) {
    console.error('Error en GET /');
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
    console.error('Error en PATCH /:id/role');
    next(err);
  }
});

// DELETE usuario (solo admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res, next) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM CommentLikes WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM Notifications WHERE sender_id = ? OR user_id = ?', [id, id]);
        await connection.query('DELETE FROM Comments WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM BookVotes WHERE user_id = ?', [id]);
        await connection.query('DELETE FROM Books WHERE uploader_id = ?', [id]);
        const [result] = await connection.query('DELETE FROM Users WHERE id = ?', [id]);
        await connection.commit();
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Usuario y todo su contenido asociado han sido eliminados.' });
    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar el usuario");
        next(error);
    } finally {
        connection.release();
    }
});

// GET bookmarks de un usuario
router.get('/:id/bookmarks', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT b.* FROM Books b
            JOIN Bookmarks bm ON b.id = bm.book_id
            WHERE bm.user_id = ?
            ORDER BY bm.created_at DESC
        `;
        const [books] = await db.query(sql, [id]);
        res.json({ books });
    } catch (error) {
        console.error('Error en GET /:id/bookmarks');
        next(error);
    }
});

module.exports = router;
