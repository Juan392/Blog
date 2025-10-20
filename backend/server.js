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
const PORT = process.env.PORT || 8080;

// ======== Middlewares ========
app.use(cors({
    origin: ['https://blog-production-bfac.up.railway.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// ======== Cron job: eliminar usuarios no verificados ========
cron.schedule('0 0 * * *', async () => {
    console.log('🗑️ Ejecutando limpieza de usuarios no verificados...');
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sql = `
            DELETE FROM Users 
            WHERE status = 'unverified' 
            AND created_at < ?
        `;
        const [result] = await db.query(sql, [twentyFourHoursAgo]);
        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} usuarios eliminados.`);
        } else {
            console.log('🧹 No hay usuarios por eliminar.');
        }
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
    }
});

// ======== Archivos estáticos ========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

app.use('/html', express.static(path.join(__dirname, '../html')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// ======== Rutas ========
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const notificationRoutes = require('./routes/notifications');
const createAdminAccount = require('./scripts/seedAdmin');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/notifications', notificationRoutes);

// ======== Ruta 404 ========
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
});

// ======== Manejo global de errores ========
app.use((err, req, res, next) => {
    console.error('⚠️ Error inesperado:', err.stack);
    res.status(500).json({ message: 'Error interno del servidor.', error: err.message });
});

// ======== Iniciar servidor ========
db.getConnection()
  .then(() => {
      console.log('✅ Conectado a la base de datos.');
      app.listen(PORT, () => {
          console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
          createAdminAccount().catch(err => console.error('❌ Error creando admin:', err));
      });
  })
  .catch((err) => {
      console.error('❌ Error al conectar con la base de datos:', err);
      process.exit(1);
  });
