const express = require('express');
const router = express.Router();
const CategoryModel = require('../models/Category');
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const AuditLogModel = require('../models/AuditLog');

router.get('/', auth.authenticate, (req, res) => {
    try {
        const scope = req.query.scope;
        const categories = CategoryModel.getAll(scope);
        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/',
    auth.authenticate,
    auth.authorize('Admin'),
    validate(schemas.createCategory),
    (req, res) => {
        try {
            const { name, scope } = req.body;
            const id = CategoryModel.create(name, scope);

            AuditLogModel.log(
                req.user.id,
                'CREATE_CATEGORY',
                'category',
                id,
                { name, scope },
                req.ip
            );

            res.status(201).json({
                id,
                name,
                scope
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.put('/:id',
    auth.authenticate,
    auth.authorize('Admin'),
    validate(schemas.createCategory),
    (req, res) => {
        try {
            const { name, scope } = req.body;
            const id = req.params.id;

            const existing = CategoryModel.findById(id);
            if (!existing) {
                return res.status(404).json({ error: 'Category not found' });
            }

            CategoryModel.update(id, name, scope);

            AuditLogModel.log(
                req.user.id,
                'UPDATE_CATEGORY',
                'category',
                id,
                { name, scope },
                req.ip
            );

            res.json({ id, name, scope });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.delete('/:id',
    auth.authenticate,
    auth.authorize('Admin'),
    (req, res) => {
        try {
            const id = req.params.id;

            const existing = CategoryModel.findById(id);
            if (!existing) {
                return res.status(404).json({ error: 'Category not found' });
            }

            CategoryModel.delete(id);

            AuditLogModel.log(
                req.user.id,
                'DELETE_CATEGORY',
                'category',
                id,
                existing,
                req.ip
            );

            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
