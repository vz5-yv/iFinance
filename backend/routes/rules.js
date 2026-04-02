const express = require('express');
const router = express.Router();
const RuleModel = require('../models/Rule');
const auth = require('../middleware/auth');

// GET all rules
router.get('/', auth.authenticate, (req, res) => {
    try {
        res.json({ rules: RuleModel.getAll() });
    } catch (e) {
        console.error('Get rules error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST create rule
router.post('/', auth.authenticate, auth.authorize('Admin', 'Accountant'), (req, res) => {
    try {
        const { keyword, category_id, scope, priority } = req.body;
        if (!keyword || !category_id || !scope) {
            return res.status(400).json({ error: 'keyword, category_id and scope are required' });
        }
        const id = RuleModel.create(keyword.trim(), category_id, scope, priority || 1);
        res.status(201).json({ id, keyword, category_id, scope, priority: priority || 1 });
    } catch (e) {
        console.error('Create rule error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update rule
router.put('/:id', auth.authenticate, auth.authorize('Admin', 'Accountant'), (req, res) => {
    try {
        const { keyword, category_id, scope, priority } = req.body;
        if (!RuleModel.findById(req.params.id)) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        RuleModel.update(req.params.id, keyword.trim(), category_id, scope, priority || 1);
        res.json({ id: req.params.id, keyword, category_id, scope, priority });
    } catch (e) {
        console.error('Update rule error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE rule
router.delete('/:id', auth.authenticate, auth.authorize('Admin', 'Accountant'), (req, res) => {
    try {
        if (!RuleModel.findById(req.params.id)) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        RuleModel.delete(req.params.id);
        res.json({ message: 'Rule deleted' });
    } catch (e) {
        console.error('Delete rule error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
