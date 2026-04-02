const express = require('express');
const router = express.Router();
const aiManager = require('../services/aiManager');
const auth = require('../middleware/auth');

// ─── Shared helper: classify a transaction as anomaly or growth ─────────────
function buildExplanation(t, avg) {
    if (!t.category_id) return 'Giao dịch chưa được phân loại.';

    // Anomaly logic for NEW categories (avg === 0)
    if (avg === 0) {
        if (Math.abs(t.amount) > 10000000) {
            return `Cảnh báo: Giao dịch ${t.category_name} (${(t.amount || 0).toLocaleString('vi-VN')}đ) có giá trị rất lớn mặc dù chưa có lịch sử đối chiếu.`;
        }
        return 'Giao dịch mới hoặc chưa có lịch sử đối chiếu.';
    }

    if (t.type === 'expense') {
        const threshold = avg * 2.0;
        if (t.amount > threshold) {
            const dev = ((t.amount / avg - 1) * 100).toFixed(1);
            return `Cảnh báo: Chi tiêu ${t.category_name} (${(t.amount || 0).toLocaleString('vi-VN')}đ) tăng mạnh ${dev}% so với trung bình trước đó (${Math.round(avg).toLocaleString('vi-VN')}đ).`;
        }
        return 'Giao dịch ổn định trong phạm vi cho phép.';
    } else if (t.type === 'income') {
        const threshold = avg * 1.5;
        if (t.amount > threshold) {
            const dev = ((t.amount / avg - 1) * 100).toFixed(1);
            return `Tăng trưởng: Doanh thu ${t.category_name} (${(t.amount || 0).toLocaleString('vi-VN')}đ) vượt mức trung bình trước đó ${dev}% (${Math.round(avg).toLocaleString('vi-VN')}đ).`;
        }
        return 'Doanh thu ổn định.';
    }
    return 'Bình thường.';
}

router.get('/specs', auth.authenticate, async (req, res) => {
    try {
        const specs = await aiManager.getSystemSpecs();
        res.json({ specs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/status', auth.authenticate, (req, res) => {
    res.json(aiManager.getStatus());
});

router.post('/setup-engine', auth.authenticate, auth.authorize('Admin'), async (req, res) => {
    try {
        // Start background process
        aiManager.setupEngine().catch(e => console.error('Engine setup error:', e));
        res.json({ message: 'Engine download started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/setup-model', auth.authenticate, auth.authorize('Admin'), async (req, res) => {
    try {
        aiManager.setupModel().catch(e => console.error('Model setup error:', e));
        res.json({ message: 'Model download started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/start', auth.authenticate, auth.authorize('Admin'), (req, res) => {
    try {
        aiManager.startServer();
        res.json({ message: 'AI Engine starting...' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/stop', auth.authenticate, auth.authorize('Admin'), (req, res) => {
    try {
        aiManager.stopServer();
        res.json({ message: 'AI Engine stopped' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settings management
const SettingModel = require('../models/Setting');

router.get('/settings', auth.authenticate, (req, res) => {
    res.json({
        ai_storage_path: SettingModel.get('ai_storage_path') || ''
    });
});

router.post('/settings', auth.authenticate, auth.authorize('Admin'), (req, res) => {
    try {
        const { ai_storage_path } = req.body;
        SettingModel.set('ai_storage_path', ai_storage_path);
        aiManager.updatePaths();
        res.json({ message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/auto-classify', auth.authenticate, auth.authorize('Admin', 'Accountant'), async (req, res) => {
    try {
        const TransactionModel = require('../models/Transaction');
        const CategoryModel = require('../models/Category');
        const aiService = require('../services/aiService');

        const pending = TransactionModel.getAll({ status: 'pending' });
        const categories = CategoryModel.getAll();

        const results = { updated: 0, new_suggestions: 0 };

        for (const tx of pending) {
            // Suggest if not suggested or low confidence
            if (!tx.suggested_category_id || tx.confidence_score < 0.5) {
                const result = await aiService.suggestCategory(tx.description, categories);
                if (result) {
                    const updateData = {
                        suggested_category_id: result.category_id,
                        confidence_score: result.confidence
                    };

                    if (result.newCategoryName) {
                        updateData.ai_explanation = `Đề xuất danh mục mới: ${result.newCategoryName}`;
                        results.new_suggestions++;
                    }

                    TransactionModel.update(tx.id, updateData);
                    results.updated++;
                }
            }
        }

        const io = req.app.get('io');
        if (io && results.updated > 0) io.emit('transaction_updated', { action: 'auto_classify' });

        res.json(results);
    } catch (error) {
        console.error('Auto-classify error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/chat', auth.authenticate, async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const status = aiManager.getStatus();
        if (!status.isRunning) {
            return res.status(503).json({ error: 'AI Engine chưa được khởi động. Vui lòng vào AI Studio bật engine trước.' });
        }

        const db = require('../database/connection');
        const fmt = (n) => (n || 0).toLocaleString('vi-VN') + 'đ';
        const today = new Date().toISOString().split('T')[0];
        const date45DaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const thisMonth = today.substring(0, 7);

        // 1. Aggregated Statistics (All-Time)
        const catTotals = db.prepare(`
            SELECT c.name, t.type, SUM(t.amount) as total, COUNT(*) as cnt
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status = 'confirmed' AND t.date >= ?
            GROUP BY c.name, t.type
            ORDER BY total DESC
        `).all(`${new Date().getFullYear() - 1}-01-01`);

        // 1b. Aggregated Statistics (This Month ONLY)
        const thisMonthTotals = db.prepare(`
            SELECT c.name, t.type, SUM(t.amount) as total, COUNT(*) as cnt
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status = 'confirmed' AND strftime('%Y-%m', t.date) = ?
            GROUP BY c.name, t.type
            ORDER BY total DESC
        `).all(thisMonth);

        const monthlyTotals = db.prepare(`
            SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total
            FROM transactions
            WHERE status = 'confirmed' AND date >= ?
            GROUP BY month, type
            ORDER BY month DESC
        `).all(`${new Date().getFullYear() - 1}-01-01`);

        // 2. Detailed Recent Transactions (Last 45 Days) - RICH CONTEXT
        const recentTxs = db.prepare(`
            SELECT t.date, t.description, t.amount, t.type, c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status = 'confirmed' AND t.date >= ?
            ORDER BY t.date DESC
        `).all(date45DaysAgo);

        // 3. Pending & Anomaly Counts
        const pendingCount = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE status='pending'").get();
        const anomalyCount = db.prepare("SELECT COUNT(*) as cnt FROM transactions WHERE ai_explanation LIKE 'Cảnh báo%' OR ai_explanation LIKE 'Tăng trưởng%'").get();

        // ─── Build readable summaries ───────────────────────────────────
        const totalIncome = catTotals.filter(c => c.type === 'income').reduce((s, r) => s + r.total, 0);
        const totalExpense = catTotals.filter(c => c.type === 'expense').reduce((s, r) => s + r.total, 0);

        const catIncomeSummary = catTotals.filter(c => c.type === 'income')
            .map(c => `  - ${c.name}: +${fmt(c.total)} (${c.cnt} GD)`).join('\n') || '  (không có)';

        const catExpenseSummary = catTotals.filter(c => c.type === 'expense')
            .map(c => `  - ${c.name}: -${fmt(c.total)} (${c.cnt} GD)`).join('\n') || '  (không có)';

        const thisMonthExpenseSummary = thisMonthTotals.filter(c => c.type === 'expense')
            .map(c => `  - ${c.name}: -${fmt(c.total)} (${c.cnt} GD)`).join('\n') || '  (không có)';

        const monthlySummary = (() => {
            const months = {};
            monthlyTotals.forEach(r => {
                if (!months[r.month]) months[r.month] = { income: 0, expense: 0 };
                months[r.month][r.type] += r.total;
            });
            return Object.entries(months).slice(0, 12) // Show last 12 months in detail
                .map(([m, v]) => `  - ${m}: Thu +${fmt(v.income)} | Chi -${fmt(v.expense)}`)
                .join('\n');
        })();

        const recentList = recentTxs.slice(0, 100).map(t =>
            `  [${t.date}] ${t.type === 'income' ? '+' : '-'}${fmt(t.amount)} | ${t.description} | ${t.category_name || '?'}`
        ).slice(0, 200).join('\n'); // Safely limit to 200 recent items

        const sysPrompt = `Bạn là trợ lý kế toán iFinance. Hôm nay là ${today}.
Bạn có 2 nguồn dữ liệu để trả lời:
1. THỐNG KÊ TỔNG HỢP (Toàn bộ 2025-2026): Dùng để trả lời về tổng thu chi, trung bình tháng, so sánh năm, hoặc tìm tháng cao nhất/thấp nhất.
2. NHẬT KÝ CHI TIẾT (45 ngày gần đây): Dùng để trả lời về các giao dịch cụ thể mới phát sinh.

KHÔNG ĐƯỢC bịa thêm giao dịch. Nếu hỏi về giao dịch chi tiết từ năm 2025, hãy giải thích rằng bạn chỉ có thống kê tổng quan của năm đó và nhật ký chi tiết của 45 ngày gần đây.

=== 📊 THỐNG KÊ TỔNG QUAN (2025-2026) ===
💰 Tổng thu: ${fmt(totalIncome)} | 💸 Tổng chi: ${fmt(totalExpense)}
⏳ Chờ duyệt: ${pendingCount.cnt} | 🔴 Bất thường: ${anomalyCount.cnt}

--- Thu nhập theo danh mục:
${catIncomeSummary}

--- Chi tiêu theo danh mục (TẤT CẢ THỜI GIAN):
${catExpenseSummary}

--- 📅 Chi tiêu RIÊNG THÁNG NÀY (${thisMonth}):
${thisMonthExpenseSummary}

--- Diễn biến 12 tháng gần nhất:
${monthlySummary}

=== 📝 NHẬT KÝ CHI TIẾT (45 ngày gần nhất - Tối đa 100 GD) ===
${recentList}

QUY TẮC QUAN TRỌNG:
- Trả lời bằng Markdown đẹp, chuyên nghiệp.
- Nếu người dùng hỏi về giao dịch cụ thể trong tháng này/tháng trước, hãy tra cứu trong "NHẬT KÝ CHI TIẾT" bên trên. Nếu thấy, hãy liệt kê ra. Nếu không thấy, hãy giải thích là bạn chỉ có nhật ký 45 ngày gần nhất.
- Luôn ưu tiên dùng số liệu "CHI TIÊU RIÊNG THÁNG NÀY" để trả lời về tình hình hiện tại.`;

        const aiService = require('../services/aiService');

        // Build messages with conversation history
        const messages = [
            { role: 'system', content: sysPrompt },
            ...history.slice(-10).map(m => ({ role: m.role, content: m.content })), // Keep last 10 messages for context
            { role: 'user', content: message }
        ];

        const response = await fetch(`${aiService.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'local-model',
                messages,
                temperature: 0.3,
                max_tokens: 900
            }),
            signal: AbortSignal.timeout(60000)
        });

        if (!response.ok) throw new Error(`AI returned ${response.status}`);
        const data = await response.json();
        const reply = data.choices[0].message.content;

        res.json({ reply });
    } catch (error) {
        console.error('Chat error:', error);
        if (error.name === 'AbortError' || error.message?.includes('503')) {
            res.status(503).json({ error: 'AI Engine chưa sẵn sàng hoặc quá tải. Vui lòng thử lại.' });
        } else {
            res.status(500).json({ error: error.message || 'AI không phản hồi' });
        }
    }
});

/**
 * Bulk Analysis: Process all transactions in one go (fast)
 */
router.post('/analyze-all', auth.authenticate, async (req, res) => {
    const db = require('../database/connection');
    try {
        const transactions = db.prepare(`
            SELECT t.*, c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status IN ('confirmed', 'pending')
            ORDER BY t.date ASC, t.created_at ASC
        `).all();

        // Optimization: Fetch all historical success once to build a running average map
        // avoid N+1 SELECT inside the loop
        const allHistory = db.prepare(`
            SELECT category_id, amount, date
            FROM transactions
            WHERE status = 'confirmed'
            ORDER BY date ASC, created_at ASC
        `).all();

        // Group history by category for fast lookups
        const historyByCategory = {};
        for (const h of allHistory) {
            if (!historyByCategory[h.category_id]) historyByCategory[h.category_id] = [];
            historyByCategory[h.category_id].push(h);
        }

        // Use a database transaction for pure speed, but keep it synchronous for the DB
        // To avoid blocking the event loop for too long, we process in chunks
        const chunkSize = 100;
        let analyzedCount = 0;

        const processChunk = db.transaction((txs) => {
            const updateStmt = db.prepare("UPDATE transactions SET ai_explanation = ? WHERE id = ?");
            const runningStats = {}; 

            for (const t of txs) {
                const catId = t.category_id;
                if (!runningStats[catId]) runningStats[catId] = { sum: 0, count: 0, index: 0 };

                const catHistory = historyByCategory[catId] || [];
                let stats = runningStats[catId];
                
                while (stats.index < catHistory.length && catHistory[stats.index].date < t.date) {
                    stats.sum += catHistory[stats.index].amount;
                    stats.count++;
                    stats.index++;
                }

                const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                const explanation = buildExplanation(t, avg);

                updateStmt.run(explanation, t.id);
                analyzedCount++;
            }
        });

        // Process all transactions in chunks
        for (let i = 0; i < transactions.length; i += chunkSize) {
            const chunk = transactions.slice(i, i + chunkSize);
            processChunk(chunk);
            // Yield if it's a large set (optional, but good for very long lists)
            // if (transactions.length > 500) await new Promise(r => setTimeout(r, 0));
        }

        console.log(`[AI] Bulk analysis (Optimized) completed: ${analyzedCount} items.`);

        const io = req.app.get('io');
        if (io) io.emit('transaction_updated', { action: 'bulk_analyze' });

        res.json({ success: true, count: analyzedCount });
    } catch (error) {
        console.error('Bulk analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

// BM-01 FIX: require authentication + Admin authorization on /re-analyze
router.post('/re-analyze', auth.authenticate, auth.authorize('Admin'), async (req, res) => {
    const db = require('../database/connection');
    try {
        const { force } = req.body;
        if (force) {
            // Explicitly clear all explanations to force a fresh analysis
            db.prepare("UPDATE transactions SET ai_explanation = NULL WHERE status IN ('confirmed', 'pending')").run();
            console.log("[AI] Forced reset of all transaction explanations.");
            return res.json({ reset: true });
        }

        const pending = db.prepare(`
            SELECT t.*, c.name as category_name 
            FROM transactions t 
            LEFT JOIN categories c ON t.category_id = c.id 
            WHERE t.ai_explanation IS NULL AND t.status IN ('confirmed', 'pending') 
            ORDER BY t.date ASC
            LIMIT 10
        `).all();

        if (pending.length === 0) return res.json({ processed: 0 });

        // Optimization: Fetch historical averages in bulk instead of N+1 SELECT
        for (const t of pending) {
            const stats = db.prepare(`
                SELECT AVG(amount) as avg, COUNT(*) as count
                FROM transactions
                WHERE category_id = ? AND status = 'confirmed' AND date < ?
            `).get(t.category_id, t.date);

            const avg = stats ? (stats.avg || 0) : 0;
            const explanation = buildExplanation(t, avg);
            db.prepare("UPDATE transactions SET ai_explanation = ? WHERE id = ?").run(explanation, t.id);
        }
        res.json({ processed: pending.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;