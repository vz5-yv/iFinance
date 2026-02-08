const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserModel = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const auth = {
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    },

    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    },

    generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    },

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    },

    authenticate(req, res, next) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = auth.verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const user = UserModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        next();
    },

    authorize(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        };
    }
};

module.exports = auth;
