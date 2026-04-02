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

            // Only auto-suggest/set pending if category_id is not explicitly provided
            if (!data.category_id) {
                const classification = classifierService.classifyTransaction(
                    data.description,
                    data.scope
                );

                if (classifierService.shouldSuggest(classification.confidence)) {
                    data.suggested_category_id = classification.category_id;
                    data.confidence_score = classification.confidence;
                    data.status = 'pending';
                }
            } else {
                data.status = 'confirmed';
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

            const io = req.app.get('io');
            if (io) io.emit('transaction_updated', { action: 'create' });

            const transaction = TransactionModel.findById(id);

            if (transaction.category_id) {
                const allStats = TransactionModel.getCategoryStats({});
                const anomalyCheck = anomalyDetector.detectAnomalies(
                    transaction.category_id,
                    transaction.amount,
                    transaction.type,
                    allStats
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

router.post('/import',
    auth.authenticate,
    auth.authorize('Admin', 'Accountant'),
    (req, res) => {
        try {
            const { transactions } = req.body;
            if (!Array.isArray(transactions) || transactions.length === 0) {
                return res.status(400).json({ error: 'transactions array is required' });
            }

            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const item of transactions) {
                try {
                    const data = {
                        date: item.date,
                        description: item.description,
                        amount: parseFloat(item.amount),
                        type: item.type,
                        scope: item.scope,
                        category_id: item.category_id || null,
                        source: item.source || 'csv_import',
                        created_by: req.user.id
                    };

                    // Auto classify if no direct category
                    if (!data.category_id) {
                        const classification = classifierService.classifyTransaction(
                            data.description,
                            data.scope
                        );
                        if (classifierService.shouldSuggest(classification.confidence)) {
                            data.suggested_category_id = classification.category_id;
                            data.confidence_score = classification.confidence;
                            data.status = 'pending';
                        }
                    }

                    const id = TransactionModel.create(data);

                    AuditLogModel.log(
                        req.user.id,
                        'CREATE_TRANSACTION',
                        'transaction',
                        id,
                        { amount: data.amount, type: data.type, import: true },
                        req.ip
                    );

                    results.success++;
                } catch (e) {
                    results.failed++;
                    results.errors.push(`Row format error: ${e.message}`);
                }
            }

            const io = req.app.get('io');
            if (io && results.success > 0) io.emit('transaction_updated', { action: 'import' });

            res.status(200).json(results);
        } catch (error) {
            console.error('Import transactions error:', error);
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
            limit: req.query.limit,
            offset: req.query.offset
        };

        const transactions = TransactionModel.getAll(filters);
        const total = TransactionModel.count(filters);
        res.json({ transactions, total });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/stats', auth.authenticate, (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            category_id: req.query.category_id,
            scope: req.query.scope
        };

        const stats = TransactionModel.getStats(filters);
        const categoryStats = TransactionModel.getCategoryStats(filters);

        res.json({ stats, categoryStats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/anomalies', auth.authenticate, async (req, res) => {
    try {
        const anomalies = anomalyDetector.getAnomalousTransactions(
            req.query.start_date,
            req.query.end_date
        );

        // Fetch AI explanations for anomalies that don't have them yet
        const aiService = require('../services/aiService');
        for (let i = 0; i < anomalies.length; i++) {
            if (!anomalies[i].ai_explanation) {
                // Parse the mean from anomaly_reason ("... trung bình Xđ")
                const match = anomalies[i].anomaly_reason.match(/trung bình ([\d,\.]+)đ/);
                let avg = 0;
                if (match) {
                    avg = parseFloat(match[1].replace(/\./g, '').replace(/,/g, ''));
                }
                const explanation = await aiService.explainAnomaly(anomalies[i], avg);

                // Save to DB to cache the AI response
                TransactionModel.update(anomalies[i].id, { ai_explanation: explanation });
                anomalies[i].ai_explanation = explanation;
            }
        }

        const legacyAnomalies = anomalies.filter(a => a.anomaly_details && a.anomaly_details.isAnomaly);

        // Also fetch any transactions that have a Warning/Growth AI explanation but were NOT found by the legacy detector
        const db = require('../database/connection');
        const aiFlagged = db.prepare(`
            SELECT t.*, c.name as category_name, sc.name as suggested_category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN categories sc ON t.suggested_category_id = sc.id
            WHERE t.date BETWEEN ? AND ?
              AND (t.ai_explanation LIKE 'Cảnh báo%' OR t.ai_explanation LIKE 'Tăng trưởng%')
              AND t.id NOT IN (${legacyAnomalies.length > 0 ? legacyAnomalies.map(a => a.id).join(',') : '-1'})
        `).all(req.query.start_date, req.query.end_date);

        const allAnomalies = [...legacyAnomalies, ...aiFlagged.map(f => ({
            ...f,
            anomaly_reason: 'AI Detection',
            anomaly_details: { isAnomaly: true, reason: 'AI Detection' }
        }))];

        res.json({ anomalies: allAnomalies });
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

            const io = req.app.get('io');
            if (io) io.emit('transaction_updated', { action: 'update' });

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

            const io = req.app.get('io');
            if (io) io.emit('transaction_updated', { action: 'confirm' });

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

            const io = req.app.get('io');
            if (io) io.emit('transaction_updated', { action: 'delete' });

            res.json({ message: 'Transaction deleted successfully' });
        } catch (error) {
            console.error('Delete transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
