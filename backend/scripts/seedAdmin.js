require('dotenv').config(); 
const bcrypt = require('bcrypt');
const db = require('../config/db'); 

async function createAdminAccount() {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('❌ Por favor, define ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD en tu archivo .env');
        return;
    }
    const [existingAdmins] = await db.query('SELECT * FROM Users WHERE email = ?', [adminEmail]);

    if (existingAdmins.length > 0) {
        console.log('✅ La cuenta de administrador ya existe. No se necesita hacer nada.');
        return;
    }
    console.log('🌱 Creando la cuenta de administrador...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const sql = `
        INSERT INTO Users (full_name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(sql, ['Administrador del Sitio', adminEmail, passwordHash, 'admin', 'verified']);
    console.log('🚀 ¡Cuenta de administrador creada exitosamente!');
}

createAdminAccount().then(() => {
    db.end(); 
}).catch(error => {
    console.error('🔥 Error al crear la cuenta de administrador:', error);
    db.end();
});