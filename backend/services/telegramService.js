const TelegramBot = require('node-telegram-bot-api');
const TransactionModel = require('../models/Transaction');
const classifierService = require('./classifier');
const AuditLogModel = require('../models/AuditLog');
const UserModel = require('../models/User');

const token = process.env.TELEGRAM_BOT_TOKEN;

// BM-02: Rate limit per chatId — max 10 messages per 60 seconds
const rateLimitMap = new Map();

function checkRateLimit(chatId) {
    const now = Date.now();
    const recent = (rateLimitMap.get(chatId) || []).filter(t => now - t < 60000);
    if (recent.length >= 10) return false; // Too many
    rateLimitMap.set(chatId, [...recent, now]);
    return true;
}

module.exports = function (io) {
    if (!token || token === 'your_bot_token_here') {
        console.warn('⚠️ Telegram Bot Token is missing in .env. Telegram integration disabled.');
        return null;
    }

    const bot = new TelegramBot(token, { polling: true });

    // Basic command handling
    bot.onText(/\/start|\/help/, (msg) => {
        const chatId = msg.chat.id;
        const resp = `👋 Xin chào! Tôi là Bot quản lý thu chi iFinance.\n\n` +
            `Vui lòng nhập giao dịch theo định dạng tự nhiên.\n` +
            `Ví dụ: "Chi 500k an trua" hoặc "Thu 10tr luong tháng 3".\n\n` +
            `Hệ thống sẽ tự động quét số tiền và dùng AI để phân loại danh mục, sau đó đưa vào trạng thái "Chờ xác nhận" trên hệ thống.`;
        bot.sendMessage(chatId, resp);
    });

    // Natural text parsing for quick transaction entry
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        const user = UserModel.findByChatId(chatId.toString());
        if (!user) {
            if (text && !text.startsWith('/')) {
                bot.sendMessage(chatId, '⚠️ Tài khoản Telegram của bạn chưa được liên kết với iFinance.\n' +
                    'Vui lòng vào phần **Cài đặt -> Hệ thống** trên ứng dụng để nhập Chat ID của bạn.\n' +
                    `Chat ID của bạn là: \`${chatId}\``, { parse_mode: 'Markdown' });
            }
            return;
        }

        // BM-02: enforce rate limit
        if (!checkRateLimit(chatId)) {
            bot.sendMessage(chatId, '⚠️ Bạn gửi quá nhiều tin nhắn. Vui lòng đợi 1 phút.');
            return;
        }

        // Ignore commands
        if (!text || text.startsWith('/')) return;

        let type = 'expense';
        let amount = 0;
        let description = text;
        let suggestedCategoryId = null;

        // AI Parsing Attempt
        const aiService = require('./aiService');
        const db = require('../database/connection');
        try {
            const categories = db.prepare('SELECT id, name FROM categories').all();
            const aiResult = await aiService.parseTelegramMessage(text, categories);

            if (aiResult && typeof aiResult.amount === 'number') {
                amount = aiResult.amount;
                type = aiResult.type === 'income' ? 'income' : 'expense';
                description = aiResult.description || text;
                if (aiResult.suggested_category_id) {
                    suggestedCategoryId = aiResult.suggested_category_id;
                }
                console.log('🤖 AI parsed successfully:', aiResult);
            }
        } catch (e) {
            console.error('AI parsing failed, falling back to regex...', e);
        }

        // Fallback logic if AI failed
        if (amount === 0) {
            const lowerText = text.toLowerCase();
            if (lowerText.startsWith('thu ')) type = 'income';
            else if (lowerText.startsWith('chi ')) type = 'expense';

            // LG-07: Prioritised suffix map — 'tr' before 't' to avoid ambiguity
            const suffixMap = { 'triệu': 1_000_000, 'tr': 1_000_000, 'm': 1_000_000, 'k': 1_000, 't': 1_000 };
            const amountRegex = /(?:thu|chi)?\s*([\d,\.]+)\s*(triệu|tr|m|k|t)?\s*(.*)/i;
            const match = lowerText.match(amountRegex);

            if (match) {
                let rawNum = parseFloat(match[1].replace(/,/g, '').replace(/\./g, ''));
                const suffix = (match[2] || '').toLowerCase();
                rawNum *= suffixMap[suffix] || 1;
                amount = rawNum;
                description = match[3] ? match[3].trim() : text;
            }
        }

        if (amount === 0) {
            bot.sendMessage(chatId, '❌ Không thể nhận diện số tiền. Vui lòng thử lại theo định dạng: "Chi 50k ăn trưa".');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const data = {
            date: today,
            description: description,
            amount: amount,
            type: type,
            scope: /cá nhân|personal|riêng/i.test(text) ? 'personal' : 'business',
            status: 'pending', // Always pending from Telegram
            source: 'telegram',
            created_by: user.id
        };

        // Auto classify using existing rule logic if AI didn't provide one
        if (suggestedCategoryId) {
            data.suggested_category_id = suggestedCategoryId;
            data.confidence_score = 0.95; // AI confidence
        } else {
            const classification = classifierService.classifyTransaction(description, data.scope);
            if (classifierService.shouldSuggest(classification.confidence)) {
                data.suggested_category_id = classification.category_id;
                data.confidence_score = classification.confidence;
            }
        }

        try {
            const id = TransactionModel.create(data);

            AuditLogModel.log(
                user.id,
                'CREATE_TRANSACTION',
                'transaction',
                id,
                { amount: data.amount, type: data.type, source: 'telegram' },
                'telegram-bot'
            );

            // Emit Socket.io event
            if (io) {
                io.emit('transaction_updated', { source: 'telegram', id });
            }

            bot.sendMessage(chatId, `✅ Đã ghi nhận: ${type === 'income' ? 'Thu' : 'Chi'} ${amount.toLocaleString('vi-VN')}đ cho "${description}".\n(Trạng thái: Chờ xác nhận)`);
        } catch (e) {
            console.error('Telegram bot error creating transaction:', e);
            bot.sendMessage(chatId, '❌ Lỗi hệ thống khi lưu giao dịch.');
        }
    });

    console.log('🤖 Telegram Bot Service initialized (Pending tab enabled).');

    module.exports = bot;
};
