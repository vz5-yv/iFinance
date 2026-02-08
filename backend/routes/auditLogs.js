const express = require('express');
const router = express.Router();
const AuditLogModel = require('../models/AuditLog');
const auth = require('../middleware/auth');

router.get('/',
    auth.authenticate,
    auth.authorize('Admin'),
    (req, res) => {
        try {
            const filters = {
                user_id: req.query.user_id,
                action: req.query.action,
                entity_type: req.query.entity_type,
                start_date: req.query.start_date,
                limit: req.query.limit ? parseInt(req.query.limit) : 100
            };

            const logs = AuditLogModel.getAll(filters);
            res.json({ logs });
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
