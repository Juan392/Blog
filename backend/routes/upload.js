const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router(); // ← este reemplaza tu "import router from ./auth"
const db = require("../config/db"); 


const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
  multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

router.post("/comments", upload.single("media"), async (req, res) => {
  try {
    const { bookId, text } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const comment = {
      bookId,
      text,
      mediaUrl,
      mediaType: req.file ? req.file.mimetype.split("/")[0] : null, 
      createdAt: new Date()
    };

    await db.query(
      "INSERT INTO comments (book_id, text, media_url, media_type, created_at) VALUES (?, ?, ?, ?, ?)",
      [comment.bookId, comment.text, comment.mediaUrl, comment.mediaType, comment.createdAt]
    );

    res.status(200).json({ success: true, comment });
  } catch (error) {
    console.error("Error al subir comentario:", error);
    res.status(500).json({ error: "Error al subir el comentario" });
  }
});

module.exports = router;
