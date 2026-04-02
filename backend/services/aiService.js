const axios = require('axios'); // We can use fetch or axios. Assuming standard Node fetch isn't always reliable across older versions, let's use fetch since Node 18+ is used.

class AIService {
    constructor() {
        this.apiUrl = process.env.AI_API_URL || 'http://127.0.0.1:1234/v1';
        this.model = 'local-model'; // LM Studio ignores this, but it's required for the format
    }

    async callLLM(systemPromptOrMessages, userPrompt = null, jsonMode = false) {
        let messages = [];
        if (Array.isArray(systemPromptOrMessages)) {
            messages = systemPromptOrMessages;
        } else {
            messages = [
                { role: 'system', content: systemPromptOrMessages },
                { role: 'user', content: userPrompt }
            ];
        }

        try {
            const response = await fetch(`${this.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: 0.2,
                    response_format: jsonMode ? { type: "json_object" } : undefined
                }),
                signal: AbortSignal.timeout(45000) // Lowered to 45s, but better than 15s
            });

            if (!response.ok) {
                throw new Error(`AI API Error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            return jsonMode ? JSON.parse(content) : content;
        } catch (error) {
            console.error('AI Service Error:', error.message);
            return null; // Graceful degradation
        }
    }

    /**
     * Parse unstructured telegram text into a structured transaction object
     */
    async parseTelegramMessage(text, availableCategories) {
        const catStr = availableCategories.map(c => `[ID:${c.id}] ${c.name}`).join(', ');
        const systemPrompt = `Bạn là một trợ lý ảo kế toán thông minh tiếng Việt. 
Nhiệm vụ của bạn là trích xuất thông tin giao dịch từ tin nhắn văn bản của người dùng và trả về MỘT chuỗi JSON hợp lệ.
KHÔNG giải thích, KHÔNG thêm markdown, CHỈ trả về JSON.

Cấu trúc JSON mong muốn:
{
  "amount": <number, số tiền VND (ví dụ 50k = 50000, 2tr = 2000000)>,
  "type": <string, "income" nếu là thu, "expense" nếu là chi>,
  "description": <string, mô tả ngắn gọn (loại bỏ số tiền)>,
  "suggested_category_id": <number hoặc null, chọn ID danh mục phù hợp nhất từ danh sách bên dưới>
}

Danh sách danh mục đang có:
${catStr}`;

        const userPrompt = `Tin nhắn: "${text}"`;

        try {
            const result = await this.callLLM(systemPrompt, userPrompt, true);
            if (!result || typeof result.amount !== 'number' || typeof result.type !== 'string') {
                return null; // fallback
            }
            return result;
        } catch (e) {
            console.error('Error parsing Telegram text via AI:', e);
            return null;
        }
    }

    /**
     * Generate a natural language explanation for an anomalous transaction
     */
    async explainAnomaly(transaction, categoryAvg) {
        const systemPrompt = `Bạn là chuyên gia phân tích tài chính cá nhân và doanh nghiệp.
        Bạn nhận được thông tin về một giao dịch CÓ DẤU HIỆU BẤT THƯỜNG (số tiền quá lớn so với trung bình).
        Nhiệm vụ: Viết 1-2 câu ngắn gọn bằng tiếng Việt để lý giải sự bất thường này cho người dùng hiểu. Không dùng từ ngữ quá kỹ thuật.`;

        const userPrompt = `Giao dịch bất thường:
        - Diễn giải: ${transaction.description}
        - Số tiền chi: ${transaction.amount.toLocaleString('vi-VN')} đ
        - Trung bình hạng mục này mọi khi: ${categoryAvg.toLocaleString('vi-VN')} đ

        Hãy viết một câu cảnh báo và phân tích độ chênh lệch.`;

        const explanation = await this.callLLM(systemPrompt, userPrompt, false);
        return explanation || `Giao dịch lệch chuẩn so với mức trung bình ${categoryAvg.toLocaleString('vi-VN')}đ.`;
    }

    /**
     * Suggest a category for a description, or a new category name if none fit
     */
    async suggestCategory(description, existingCategories) {
        const catList = existingCategories.map(c => `[ID:${c.id}] ${c.name}`).join(', ');
        const systemPrompt = `Bạn là chuyên gia kế toán. Phân loại giao dịch sau vào danh mục phù hợp.
        Nếu thấy danh mục nào hiện có phù hợp (>70% chắc chắn), hãy trả về ID của nó.
        Nếu KHÔNG có danh mục nào phù hợp, hãy trả về category_id: null và đề xuất 1 tên danh mục mới ngắn gọn trong "newCategoryName".

        Trả về JSON duy nhất: {"category_id": number|null, "confidence": number, "newCategoryName": string|null}

        Danh sách danh mục: ${catList}`;

        const userPrompt = `Mô tả giao dịch: "${description}"`;
        return this.callLLM(systemPrompt, userPrompt, true);
    }
}

module.exports = new AIService();
