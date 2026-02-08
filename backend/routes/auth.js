const express = require('express');
const router = express.Router();
const UserModel = require('../models/User');
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const AuditLogModel = require('../models/AuditLog');

router.post('/login', validate(schemas.login), async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = UserModel.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await auth.comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = auth.generateToken(user);

        AuditLogModel.log(
            user.id,
            'LOGIN',
            'user',
            user.id,
            null,
            req.ip
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register',
    auth.authenticate,
    auth.authorize('Admin'),
    validate(schemas.createUser),
    async (req, res) => {
        try {
            const { username, password, role } = req.body;

            const existing = UserModel.findByUsername(username);
            if (existing) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const passwordHash = await auth.hashPassword(password);
            const userId = UserModel.create(username, passwordHash, role);

            AuditLogModel.log(
                req.user.id,
                'CREATE_USER',
                'user',
                userId,
                { username, role },
                req.ip
            );

            res.status(201).json({
                id: userId,
                username,
                role
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.get('/me', auth.authenticate, (req, res) => {
    res.json({ user: req.user });
});

router.get('/users',
    auth.authenticate,
    auth.authorize('Admin'),
    (req, res) => {
        try {
            const users = UserModel.getAll();
            res.json({ users });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
