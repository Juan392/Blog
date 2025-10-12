// 1. Importaciones
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');
const allowedOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500'];
// 2. Inicialización
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Middlewares
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev')); 

// 4. Rutas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const notificationRoutes = require('./routes/notifications');



app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notifications', notificationRoutes);

// 5. Ruta inexistente (404)
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
});

// 6. Manejo global de errores
app.use((err, req, res, next) => {
    console.error('⚠️ Error inesperado:', err.stack);
    res.status(500).json({ message: 'Error interno del servidor.' });
});

// 7. Conexión a la base de datos e inicio del servidor
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
