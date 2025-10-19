const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { createNotification } = require('./notificationsUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configuración de multer para libros (PDFs)
const storageBooks = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadBooks = multer({
  storage: storageBooks,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) !== '.pdf') {
      req.fileError = 'Solo archivos PDF son permitidos';
      return cb(null, false);
    }
    cb(null, true);
  }
});

// Configuración de multer para comentarios (imágenes y videos)
const uploadComments = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      req.fileError = 'Solo imágenes y videos son permitidos';
      return cb(null, false);
    }
    cb(null, true);
  }
});

// Función auxiliar para crear notificación
async function createNotificationWithSenderName(user_id, sender_id, messageTemplate, type, related_id) {
  try {
    const [sender] = await db.query('SELECT full_name FROM Users WHERE id = ?', [sender_id]);
    const senderName = sender.length > 0 ? sender[0].full_name : 'Usuario';
    const message = messageTemplate.replace('{sender}', senderName);
    await createNotification(user_id, sender_id, message, type, related_id);

    if (process.env.NODE_ENV !== 'production')
      console.log(`🔔 Notificación creada (${type})`);
  } catch (err) {
    console.error('Error creando notificación');
  }
}

// 📚 Obtener todos los libros con paginación
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM Books');
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT b.*, IFNULL(c.comments_count, 0) AS comments_count
      FROM Books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) AS comments_count
        FROM Comments
        GROUP BY book_id
      ) c ON b.id = c.book_id
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`;
    const [books] = await db.query(sql, [limit, offset]);

    res.json({ books, totalPages, currentPage: page });
  } catch (error) {
    console.error('Error en GET /books');
    next(error);
  }
});

// 📦 Publicar libro con PDF
router.post('/', authenticateToken, uploadBooks.single('pdfFile'), async (req, res, next) => {
  try {
    if (req.fileError) return res.status(400).json({ message: req.fileError });

    const { title, author, synopsis, external_link } = req.body || {};
    if (!title || !author) return res.status(400).json({ message: 'Título y autor son requeridos.' });

    const pdf_url = req.file ? `/uploads/${req.file.filename}` : null;
    const sql = 'INSERT INTO Books (title, author, synopsis, external_link, pdf_url, uploader_id) VALUES (?, ?, ?, ?, ?, ?)';
    const [result] = await db.query(sql, [title, author, synopsis, external_link || null, pdf_url, req.user.userId]);

    if (process.env.NODE_ENV !== 'production') console.log('✅ Libro insertado correctamente');

    // Notificar a otros usuarios
    const [users] = await db.query('SELECT id FROM Users WHERE id != ?', [req.user.userId]);
    users.forEach(user => {
      const template = `Nuevo libro publicado: "${title}" por {sender}`;
      createNotificationWithSenderName(user.id, req.user.userId, template, 'book_upload', result.insertId);
    });

    res.status(201).json({ message: 'Libro publicado con éxito.', bookId: result.insertId });
  } catch (error) {
    console.error('Error en POST /books');
    next(error);
  }
});

// 🔍 Buscar libros
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Parámetro de búsqueda requerido.' });

    const sql = `
      SELECT b.*, IFNULL(c.comments_count, 0) AS comments_count
      FROM Books b
      LEFT JOIN (
        SELECT book_id, COUNT(*) AS comments_count
        FROM Comments
        GROUP BY book_id
      ) c ON b.id = c.book_id
      WHERE b.title LIKE ? OR b.author LIKE ?
      ORDER BY b.created_at DESC`;
    const [books] = await db.query(sql, [`%${q}%`, `%${q}%`]);
    res.json({ books });
  } catch (error) {
    console.error('Error en /books/search');
    next(error);
  }
});

// 📖 Obtener libro por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [books] = await db.query('SELECT * FROM Books WHERE id = ?', [id]);
    if (books.length === 0) return res.status(404).json({ message: 'Libro no encontrado.' });
    res.json(books[0]);
  } catch (error) {
    next(error);
  }
});

// 💬 Obtener comentarios de un libro con paginación
router.get('/:id/comments', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const order = req.query.order || 'oldest';
    const offset = (page - 1) * limit;

    let orderBy =
      order === 'newest' ? 'c.created_at DESC' :
      order === 'most-likes' ? 'likes DESC, c.created_at DESC' :
      'c.created_at ASC';

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM Comments WHERE book_id = ?', [id]);
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT c.user_id, c.id, c.content, c.created_at, c.parent_id, c.media_url, c.media_type,
             COUNT(cl.id) as likes, u.full_name, u.profile_pic
      FROM Comments c
      LEFT JOIN CommentLikes cl ON cl.comment_id = c.id
      JOIN Users u ON c.user_id = u.id
      WHERE c.book_id = ?
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`;
    const [comments] = await db.query(sql, [id, limit, offset]);

    const commentsWithUrls = comments.map(c => ({
      ...c,
      profile_pic: c.profile_pic ? `${req.protocol}://${req.get('host')}${c.profile_pic}` : null,
      media_url: c.media_url ? `${req.protocol}://${req.get('host')}${c.media_url}` : null
    }));

    res.json({ comments: commentsWithUrls, totalPages, currentPage: page });
  } catch (error) {
    next(error);
  }
});

// 💾 Guardar libro (Bookmark)
router.post('/:id/save', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const [existing] = await db.query('SELECT id FROM Bookmarks WHERE user_id = ? AND book_id = ?', [userId, id]);
    if (existing.length > 0) return res.status(400).json({ message: 'Libro ya guardado.' });
    await db.query('INSERT INTO Bookmarks (user_id, book_id) VALUES (?, ?)', [userId, id]);
    res.status(201).json({ message: 'Libro guardado.' });
  } catch (error) {
    next(error);
  }
});

// ❌ Quitar libro guardado
router.delete('/:id/save', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const [result] = await db.query('DELETE FROM Bookmarks WHERE user_id = ? AND book_id = ?', [userId, id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Libro no encontrado en guardados.' });
    res.status(200).json({ message: 'Libro removido de guardados.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
