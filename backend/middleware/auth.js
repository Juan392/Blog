const jwt = require('jsonwebtoken');
const db = require('../config/db');
const cookieParser = require('cookie-parser'); 


const authenticateToken = async (req, res, next) => {
    try {
        const token = req.cookies.sessionToken;
        if (!token) return res.status(401).json({ message: 'No autenticado.' });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: payload.userId, role: payload.role, full_name: payload.full_name };
        next();
    } catch (error) {
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