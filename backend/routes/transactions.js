const express = require('express');
const router = express.Router();
const TransactionModel = require('../models/Transaction');
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');
const AuditLogModel = require('../models/AuditLog');
const classifierService = require('../services/classifier');
const anomalyDetector = require('../services/anomalyDetector');

router.post('/',
    auth.authenticate,
    auth.authorize('Admin', 'Accountant'),
    validate(schemas.createTransaction),
    (req, res) => {
        try {
            const data = {
                ...req.body,
                created_by: req.user.id
            };

            const classification = classifierService.classifyTransaction(
                data.description,
                data.scope
            );

            if (classifierService.shouldSuggest(classification.confidence)) {
                data.suggested_category_id = classification.category_id;
                data.confidence_score = classification.confidence;
                data.status = 'pending';
            }

            const id = TransactionModel.create(data);

            AuditLogModel.log(
                req.user.id,
                'CREATE_TRANSACTION',
                'transaction',
                id,
                { amount: data.amount, type: data.type },
                req.ip
            );

            const transaction = TransactionModel.findById(id);

            if (transaction.category_id) {
                const anomalyCheck = anomalyDetector.detectAnomalies(
                    transaction.category_id,
                    transaction.amount,
                    transaction.type
                );
                transaction.anomaly = anomalyCheck;
            }

            res.status(201).json({ transaction });
        } catch (error) {
            console.error('Create transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.get('/', auth.authenticate, (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            scope: req.query.scope,
            status: req.query.status,
            category_id: req.query.category_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const transactions = TransactionModel.getAll(filters);
        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/stats', auth.authenticate, (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const stats = TransactionModel.getStats(filters);
        const categoryStats = TransactionModel.getCategoryStats(filters);

        res.json({ stats, categoryStats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/anomalies', auth.authenticate, (req, res) => {
    try {
        const anomalies = anomalyDetector.getAnomalousTransactions(
            req.query.start_date,
            req.query.end_date
        );
        res.json({ anomalies });
    } catch (error) {
        console.error('Get anomalies error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', auth.authenticate, (req, res) => {
    try {
        const transaction = TransactionModel.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ transaction });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id',
    auth.authenticate,
    auth.authorize('Admin', 'Accountant'),
    validate(schemas.updateTransaction),
    (req, res) => {
        try {
            const id = req.params.id;
            const existing = TransactionModel.findById(id);

            if (!existing) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            TransactionModel.update(id, req.body);

            AuditLogModel.log(
                req.user.id,
                'UPDATE_TRANSACTION',
                'transaction',
                id,
                req.body,
                req.ip
            );

            const updated = TransactionModel.findById(id);
            res.json({ transaction: updated });
        } catch (error) {
            console.error('Update transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.post('/:id/confirm',
    auth.authenticate,
    auth.authorize('Admin', 'Accountant'),
    (req, res) => {
        try {
            const id = req.params.id;
            const transaction = TransactionModel.findById(id);

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            if (transaction.status !== 'pending') {
                return res.status(400).json({ error: 'Transaction not pending' });
            }

            TransactionModel.update(id, {
                category_id: transaction.suggested_category_id,
                status: 'confirmed'
            });

            AuditLogModel.log(
                req.user.id,
                'CONFIRM_TRANSACTION',
                'transaction',
                id,
                null,
                req.ip
            );

            const updated = TransactionModel.findById(id);
            res.json({ transaction: updated });
        } catch (error) {
            console.error('Confirm transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

router.delete('/:id',
    auth.authenticate,
    auth.authorize('Admin', 'Accountant'),
    (req, res) => {
        try {
            const id = req.params.id;
            const existing = TransactionModel.findById(id);

            if (!existing) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            TransactionModel.delete(id);

            AuditLogModel.log(
                req.user.id,
                'DELETE_TRANSACTION',
                'transaction',
                id,
                existing,
                req.ip
            );

            res.json({ message: 'Transaction deleted successfully' });
        } catch (error) {
            console.error('Delete transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
