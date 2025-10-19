require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

async function createAdminAccount() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('❌ Define ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD en .env');
        return;
    }

    try {
        const [existingAdmins] = await db.query('SELECT * FROM Users WHERE email = ?', [adminEmail]);

        if (existingAdmins.length > 0) {
            console.log('✅ La cuenta de administrador ya existe.');
            return;
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await db.query(
            'INSERT INTO Users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
            ['Administrador del Sitio', adminEmail, passwordHash, 'admin', 'verified']
        );

        console.log('🚀 ¡Cuenta de administrador creada exitosamente!');
    } catch (error) {
        console.error('🔥 Error al crear la cuenta de administrador:', error);
    }
}

module.exports = createAdminAccount;
