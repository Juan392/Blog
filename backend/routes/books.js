const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Ruta: GET /api/books (Obtener todos los libros)
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM Books ORDER BY created_at DESC';
        const [books] = await db.query(sql);
        res.json(books);
    } catch (error) {
        next(error);
    }
});

// Ruta: POST /api/books (Publicar un nuevo libro - Solo Admin y OPTIMIZADO)
router.post('/', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { title, author, synopsis } = req.body;
        if (!title || !author) return res.status(400).json({ message: 'Título y autor son requeridos.' });

        const sql = 'INSERT INTO Books (title, author, synopsis, uploader_id) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(sql, [title, author, synopsis, req.user.userId]);

        res.status(201).json({ message: 'Libro publicado con éxito.', bookId: result.insertId });

        // Notificaciones en segundo plano
        const [users] = await db.query('SELECT id FROM Users');
        const notificationMessage = `Nuevo libro publicado: "${title}"`;
        
        users.forEach(user => {
            db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [user.id, notificationMessage]);
        });

    } catch (error) {
        next(error);
    }
});

// Ruta: GET /api/books/:id (Obtener un libro específico)
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT * FROM Books WHERE id = ?';
        const [books] = await db.query(sql, [id]);
        if (books.length === 0) return res.status(404).json({ message: 'Libro no encontrado.' });
        res.json(books[0]);
    } catch (error) {
        next(error);
    }
});

// Ruta: GET /api/books/:id/comments (Obtener comentarios de un libro)
router.get('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `SELECT c.id, c.content, c.created_at, u.full_name FROM Comments c JOIN Users u ON c.user_id = u.id WHERE c.book_id = ? ORDER BY c.created_at DESC`;
        const [comments] = await db.query(sql, [id]);
        res.json(comments);
    } catch (error) {
        next(error);
    }
});

// Ruta: POST /api/books/:id/comments (Publicar un comentario)
router.post('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'El contenido no puede estar vacío.' });

        const sql = 'INSERT INTO Comments (content, user_id, book_id) VALUES (?, ?, ?)';
        const [result] = await db.query(sql, [content, req.user.userId, req.params.id]);

        const newCommentSql = `SELECT c.id, c.content, c.created_at, u.full_name FROM Comments c JOIN Users u ON c.user_id = u.id WHERE c.id = ?`;
        const [newComment] = await db.query(newCommentSql, [result.insertId]);
        res.status(201).json(newComment[0]);
    } catch (error) {
        next(error);
    }
});

// Ruta: POST /api/books/:id/upvote (Registrar un voto)
router.post('/:id/upvote', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = 'UPDATE Books SET upvotes = upvotes + 1 WHERE id = ?';
        await db.query(sql, [id]);
        
        const getUpdatedVotesSql = 'SELECT upvotes FROM Books WHERE id = ?';
        const [updatedBook] = await db.query(getUpdatedVotesSql, [id]);
        res.status(200).json({ message: 'Voto registrado.', newUpvotes: updatedBook[0].upvotes });
    } catch (error) {
        next(error);
    }
});

module.exports = router;