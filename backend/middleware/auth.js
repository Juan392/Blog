const jwt = require('jsonwebtoken');
const db = require('../config/db');
const cookieParser = require('cookie-parser'); 


const authenticateToken = async (req, res, next) => {
    try {
        console.log(req)
        console.log(req.cookies);
        const token = req.cookies.sessionToken;
        console.log('Token de cookie:', token);
        if (!token) return res.status(401).json({ message: 'No autenticado.' });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Payload JWT:', payload);

        const [users] = await db.query(
            'SELECT * FROM Users WHERE id = ? AND verification_token = ? AND token_expiry > NOW()',
            [payload.userId, token]
        );
        console.log('Usuarios encontrados:', users.length);

        if (users.length === 0) return res.status(401).json({ message: 'Token inválido o expirado.' });

        req.user = { userId: users[0].id, role: users[0].role, full_name: users[0].full_name };
        console.log('Usuario autenticado:', req.user);
        next();
    } catch (error) {
        console.log('Error en authenticateToken:', error);
        return res.status(401).json({ message: 'No autenticado.' });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};




module.exports = { authenticateToken, isAdmin };