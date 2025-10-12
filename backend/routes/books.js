const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { createNotification } = require('./notificationsUtils');

//obtener todos los libros
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const sql = `
            SELECT b.*, 
                   IFNULL(c.comments_count, 0) AS comments_count
            FROM Books b
            LEFT JOIN (
                SELECT book_id, COUNT(*) AS comments_count
                FROM Comments
                GROUP BY book_id
            ) c ON b.id = c.book_id
            ORDER BY b.created_at DESC
        `;
        const [books] = await db.query(sql);
        res.json(books);
    } catch (error) {
        next(error);
    }
});

//publicar un libro, solo admin
router.post('/', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { title, author, synopsis, external_link } = req.body;
        if (!title || !author) return res.status(400).json({ message: 'Título y autor son requeridos.' });

        const sql = 'INSERT INTO Books (title, author, synopsis, external_link, uploader_id) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [title, author, synopsis, external_link || null, req.user.userId]);

        // Notificación a todos los usuarios
        const [users] = await db.query('SELECT id FROM Users');
        users.forEach(user => createNotification(user.id, `Nuevo libro publicado: "${title}"`));

        res.status(201).json({ message: 'Libro publicado con éxito.', bookId: result.insertId });
    } catch (error) {
        next(error);
    }
});

//obtener libro por id
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

//ruta para poder comentar
router.get('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT c.user_id, c.id, c.content, c.created_at, c.likes, c.parent_id, u.full_name 
            FROM Comments c 
            JOIN Users u ON c.user_id = u.id 
            WHERE c.book_id = ? 
            ORDER BY c.created_at ASC
        `;
        const [comments] = await db.query(sql, [id]);
        res.json(comments);
    } catch (error) {
        next(error);
    }
});

//ruta para publicar los comentarios
router.post('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        console.log('Body recibido:', req.body);
        const { content, parent_id } = req.body;
        if (!content) return res.status(400).json({ message: 'El contenido no puede estar vacío.' });

        const sql = 'INSERT INTO Comments (content, user_id, book_id, parent_id) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(sql, [content, req.user.userId, req.params.id, parent_id || null]);

        const [newComment] = await db.query(
            'SELECT c.user_id,c.id, c.content, c.created_at, c.likes, c.parent_id, u.full_name FROM Comments c JOIN Users u ON c.user_id = u.id WHERE c.id = ?',
            [result.insertId]
        );

        //Notificación
        if (parent_id) {
            const [parentComment] = await db.query('SELECT user_id FROM Comments WHERE id = ?', [parent_id]);
            if (parentComment.length > 0 && parentComment[0].user_id !== req.user.userId) {
                createNotification(parentComment[0].user_id, `${req.user.fullName} respondió tu comentario`);
            }
        } else {
            const [book] = await db.query('SELECT uploader_id, title FROM Books WHERE id = ?', [req.params.id]);
            if (book.length > 0 && book[0].uploader_id !== req.user.userId) {
                createNotification(book[0].uploader_id, `${req.user.fullName} comentó en tu libro "${book[0].title}"`);
            }
        }

        res.status(201).json(newComment[0]);
    } catch (error) {
        next(error);
    }
});

//rutar para votar
router.post('/:id/upvote', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE Books SET upvotes = IFNULL(upvotes,0) + 1 WHERE id = ?', [id]);
        const [updatedBook] = await db.query('SELECT upvotes FROM Books WHERE id = ?', [id]);
        res.status(200).json({ message: 'Voto registrado.', newUpvotes: updatedBook[0].upvotes });
    } catch (error) {
        next(error);
    }
});

//dale like al comentario
router.post('/comments/:id/like', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [comments] = await db.query('SELECT * FROM Comments WHERE id = ?', [id]);
        if (comments.length === 0) return res.status(404).json({ message: 'Comentario no encontrado.' });

        await db.query('UPDATE Comments SET likes = IFNULL(likes,0) + 1 WHERE id = ?', [id]);
        const [updatedComment] = await db.query('SELECT likes FROM Comments WHERE id = ?', [id]);
        res.status(200).json({ message: 'Me gusta registrado.', likes: updatedComment[0].likes });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
