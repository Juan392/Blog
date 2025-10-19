const express = require('express'); 
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { createNotification } = require('./notificationsUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Verificar y crear carpeta uploads si no existe
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuración de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, fileFilter: function (req, file, cb) {
    if (path.extname(file.originalname) !== '.pdf') {
        req.fileError = 'Solo archivos PDF son permitidos';
        return cb(null, false);
    }
    cb(null, true);
} });

// Función auxiliar para crear notificación usando sender_id
async function createNotificationWithSenderName(user_id, sender_id, messageTemplate, type, related_id) {
    try {
        const [sender] = await db.query('SELECT full_name FROM Users WHERE id = ?', [sender_id]);
        const senderName = sender.length > 0 ? sender[0].full_name : 'Usuario';
        const message = messageTemplate.replace('{sender}', senderName);

        await createNotification(user_id, sender_id, message, type, related_id);
        console.log('🔔 Notificación creada:', { user_id, sender_id, message, type, related_id });
    } catch (err) {
        console.error('❌ Error creando notificación:', err);
    }
}

// Obtener todos los libros con paginación
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const countSql = 'SELECT COUNT(*) as total FROM Books';
        const [countResult] = await db.query(countSql);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

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
            LIMIT ? OFFSET ?
        `;
        const [books] = await db.query(sql, [limit, offset]);
        
        res.json({ books, totalPages, currentPage: page });
    } catch (error) {
        console.error('Error en GET /books:', error);
        next(error);
    }
});

// Publicar un libro con upload de PDF
router.post('/', authenticateToken, upload.single('pdfFile'), async (req, res, next) => {
    try {
        if (req.fileError) return res.status(400).json({ message: req.fileError });

        console.log('📦 Body recibido:', req.body);
        console.log('📎 Archivo recibido:', req.file ? req.file.filename : 'No se subió archivo');

        const { title, author, synopsis, external_link } = req.body || {};
        if (!title || !author) return res.status(400).json({ message: 'Título y autor son requeridos.' });

        let pdf_url = req.file ? `/uploads/${req.file.filename}` : null;

        const sql = 'INSERT INTO Books (title, author, synopsis, external_link, pdf_url, uploader_id) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await db.query(sql, [title, author, synopsis, external_link || null, pdf_url, req.user.userId]);

        console.log('✅ Libro insertado con ID:', result.insertId);

        // Notificar a todos los usuarios excepto el uploader
        const [users] = await db.query('SELECT id FROM Users WHERE id != ?', [req.user.userId]);
        users.forEach(user => {
            const template = `Nuevo libro publicado: "${title}" por {sender}`;
            createNotificationWithSenderName(user.id, req.user.userId, template, 'book_upload', result.insertId);
        });

        res.status(201).json({ message: 'Libro publicado con éxito.', bookId: result.insertId });
    } catch (error) {
        console.error('❌ Error en POST /books:', error);
        next(error);
    }
});

// Obtener libro por ID
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

// Obtener comentarios de un libro con paginación
router.get('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const countSql = 'SELECT COUNT(*) as total FROM Comments WHERE book_id = ?';
        const [countResult] = await db.query(countSql, [id]);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        const sql = `
            SELECT c.user_id, c.id, c.content, c.created_at, c.likes, c.parent_id, u.full_name, u.profile_pic
            FROM Comments c 
            JOIN Users u ON c.user_id = u.id 
            WHERE c.book_id = ? 
            ORDER BY c.created_at ASC
            LIMIT ? OFFSET ?
        `;
        const [comments] = await db.query(sql, [id, limit, offset]);

        const commentsWithPics = comments.map(c => {
            if (c.profile_pic) c.profile_pic = `${req.protocol}://${req.get('host')}${c.profile_pic}`;
            return c;
        });

        res.json({ comments: commentsWithPics, totalPages, currentPage: page });
    } catch (error) {
        next(error);
    }
});

// Publicar comentarios
router.post('/:id/comments', authenticateToken, async (req, res, next) => {
    try {
        const { content, parent_id } = req.body;
        if (!content) return res.status(400).json({ message: 'El contenido no puede estar vacío.' });

        const sql = 'INSERT INTO Comments (content, user_id, book_id, parent_id) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(sql, [content, req.user.userId, req.params.id, parent_id || null]);

        const [newComment] = await db.query(
            'SELECT c.user_id, c.id, c.content, c.created_at, c.likes, c.parent_id, u.full_name, u.profile_pic FROM Comments c JOIN Users u ON c.user_id = u.id WHERE c.id = ?',
            [result.insertId]
        );

        if (newComment[0].profile_pic) newComment[0].profile_pic = `${req.protocol}://${req.get('host')}${newComment[0].profile_pic}`;

        // Notificaciones usando sender_id
        if (parent_id) {
            const [parentComment] = await db.query('SELECT user_id FROM Comments WHERE id = ?', [parent_id]);
            if (parentComment.length > 0 && parentComment[0].user_id !== req.user.userId) {
                const template = `{sender} respondió tu comentario`;
                createNotificationWithSenderName(parentComment[0].user_id, req.user.userId, template, 'comment_reply', null);
            }
        } else {
            const [book] = await db.query('SELECT uploader_id, title FROM Books WHERE id = ?', [req.params.id]);
            if (book.length > 0 && book[0].uploader_id !== req.user.userId) {
                const template = `{sender} comentó en tu libro "${book[0].title}"`;
                createNotificationWithSenderName(book[0].uploader_id, req.user.userId, template, 'book_comment', req.params.id);
            }
        }

        res.status(201).json(newComment[0]);
    } catch (error) {
        next(error);
    }
});

// Dar like (upvote) a un libro — solo una vez por usuario
router.post('/:id/upvote', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const [existingVote] = await db.query(
            'SELECT id FROM BookVotes WHERE user_id = ? AND book_id = ?',
            [userId, id]
        );

        if (existingVote.length > 0) return res.status(400).json({ message: 'Ya votaste este libro.' });

        await db.query('INSERT INTO BookVotes (user_id, book_id) VALUES (?, ?)', [userId, id]);
        await db.query('UPDATE Books SET upvotes = IFNULL(upvotes,0) + 1 WHERE id = ?', [id]);

        const [updatedBook] = await db.query('SELECT upvotes FROM Books WHERE id = ?', [id]);
        res.status(200).json({ message: 'Voto registrado.', newUpvotes: updatedBook[0].upvotes });
    } catch (error) {
        console.error('Error en /books/:id/upvote:', error);
        next(error);
    }
});

// Dar like a un comentario
router.post('/comments/:id/like', authenticateToken, async (req, res, next) => {
    const commentId = req.params.id;
    const userId = req.user.userId;

    try {
        const sql = 'INSERT INTO CommentLikes (comment_id, user_id) VALUES (?, ?)';
        await db.query(sql, [commentId, userId]);

        const [countResult] = await db.query(
            'SELECT COUNT(*) as likes FROM CommentLikes WHERE comment_id = ?',
            [commentId]
        );

        res.status(200).json({ likes: countResult[0].likes });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya has dado like a este comentario.' });
        next(err);
    }
});

module.exports = router;
