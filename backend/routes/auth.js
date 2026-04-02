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

router.post('/telegram-chat-id',
    auth.authenticate,
    validate(schemas.updateTelegramChatId),
    (req, res) => {
        try {
            const { telegram_chat_id } = req.body;
            UserModel.updateChatId(req.user.id, telegram_chat_id);

            AuditLogModel.log(
                req.user.id,
                'UPDATE_TELEGRAM_CHAT_ID',
                'user',
                req.user.id,
                { telegram_chat_id },
                req.ip
            );

            res.json({ message: 'Telegram Chat ID updated successfully' });
        } catch (error) {
            console.error('Update telegram chat ID error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.post('/change-password',
    auth.authenticate,
    validate(schemas.changePassword),
    async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;
            const user = UserModel.findById(req.user.id);

            // Get full user with password hash
            const fullUser = UserModel.findByUsername(user.username);
            const isValid = await auth.comparePassword(oldPassword, fullUser.password_hash);

            if (!isValid) {
                return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
            }

            const newHash = await auth.hashPassword(newPassword);
            UserModel.updatePassword(req.user.id, newHash);

            AuditLogModel.log(
                req.user.id,
                'CHANGE_PASSWORD',
                'user',
                req.user.id,
                null,
                req.ip
            );

            res.json({ message: 'Đổi mật khẩu thành công' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
