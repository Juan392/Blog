require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: ['http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(cookieParser()); 
cron.schedule('0 0 * * *', async () => {
    console.log('🗑️ Ejecutando tarea de limpieza de usuarios no verificados...');
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sql = `
            DELETE FROM Users 
            WHERE status = 'unverified' 
            AND created_at < ?
        `;
        
        // 3. Ejecuta la consulta.
        const [result] = await db.query(sql, [twentyFourHoursAgo]);

        if (result.affectedRows > 0) {
            console.log(`✅ Tarea de limpieza completada. Se eliminaron ${result.affectedRows} usuarios.`);
        } else {
            console.log('🧹 No se encontraron usuarios para eliminar.');
        }
    } catch (error) {
        console.error('❌ Error durante la tarea de limpieza:', error);
    }
});


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
