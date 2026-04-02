const TransactionModel = require('../models/Transaction');
const db = require('../database/connection');

class ClassifierService {
    classifyTransaction(description, scope) {
        const descriptionLower = description.toLowerCase();

        const stmt = db.prepare(`
      SELECT r.category_id, c.name, r.priority
      FROM rules r
      JOIN categories c ON r.category_id = c.id
      WHERE (r.scope = ? OR r.scope = 'both')
        AND LOWER(?) LIKE '%' || LOWER(r.keyword) || '%'
      ORDER BY r.priority DESC, LENGTH(r.keyword) DESC
      LIMIT 1
    `);

        const match = stmt.get(scope, description);

        if (match) {
            return {
                category_id: match.category_id,
                category_name: match.name,
                confidence: 0.9
            };
        }

        const historicalStmt = db.prepare(`
      SELECT category_id, c.name, COUNT(*) as frequency
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.scope = ?
        AND t.status = 'confirmed'
        AND t.category_id IS NOT NULL
        AND LOWER(t.description) LIKE '%' || LOWER(?) || '%'
      GROUP BY t.category_id
      ORDER BY frequency DESC
      LIMIT 1
    `);

        // LG-09: single query with OR conditions instead of N separate queries
        const words = description.split(/\s+/).filter(w => w.length > 3);
        let bestMatch = null;

        if (words.length > 0) {
            const conditions = words.map(() => "LOWER(t.description) LIKE '%' || LOWER(?) || '%'").join(' OR ');
            const batchStmt = db.prepare(`
                SELECT t.category_id, c.name, COUNT(*) as frequency
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.scope = ? AND t.status = 'confirmed' AND t.category_id IS NOT NULL
                  AND (${conditions})
                GROUP BY t.category_id
                ORDER BY frequency DESC
                LIMIT 1
            `);
            const result = batchStmt.get(scope, ...words);
            if (result) bestMatch = result;
        }

        if (bestMatch) {
            return {
                category_id: bestMatch.category_id,
                category_name: bestMatch.name,
                confidence: Math.min(0.7, 0.5 + (bestMatch.frequency * 0.05))
            };
        }

        return {
            category_id: null,
            category_name: null,
            confidence: 0
        };
    }

    shouldSuggest(confidence) {
        return confidence >= 0.6;
    }
}

module.exports = new ClassifierService();
