require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');
const path = require('path');
const fs = require('fs');  // Importa fs aquí

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
const cookieParser = require('cookie-parser');
app.use(cookieParser()); // ✅ Importación


// Sirviendo archivos estáticos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const notificationRoutes = require('./routes/notifications');


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('⚠️ Error inesperado:', err.stack);
    res.status(500).json({ message: 'Error interno del servidor.', error: err.message });
});

// Iniciar servidor
db.getConnection()
  .then(() => {
      console.log('✅ Conectado correctamente a la base de datos.');
      app.listen(PORT, () => {
          console.log(`Servidor corriendo en el puerto ${PORT}`);
      });
  })
  .catch((err) => {
      console.error('Error al conectar con la base de datos:', err);
      process.exit(1);
  });
