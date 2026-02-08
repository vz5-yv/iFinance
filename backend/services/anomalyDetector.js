const TransactionModel = require('../models/Transaction');

class AnomalyDetectorService {
    detectAnomalies(categoryId, amount, type) {
        if (!categoryId) {
            return { isAnomaly: false };
        }

        const stats = TransactionModel.getCategoryStats({});

        const categoryStats = stats.find(
            s => s.id === categoryId && s.type === type
        );

        if (!categoryStats || categoryStats.count < 3) {
            return { isAnomaly: false, reason: 'Insufficient data' };
        }

        const mean = categoryStats.average;
        const stdDev = categoryStats.std_dev || 0;

        const threshold = mean + (2 * stdDev);

        if (amount > threshold) {
            return {
                isAnomaly: true,
                reason: 'Amount significantly higher than average',
                average: mean,
                threshold: threshold,
                deviation: ((amount - mean) / mean * 100).toFixed(1) + '%'
            };
        }

        const highThreshold = mean * 3;
        if (amount > highThreshold) {
            return {
                isAnomaly: true,
                reason: 'Amount more than 3x average',
                average: mean,
                deviation: ((amount - mean) / mean * 100).toFixed(1) + '%'
            };
        }

        return { isAnomaly: false };
    }

    getAnomalousTransactions(startDate, endDate) {
        const transactions = TransactionModel.getAll({
            start_date: startDate,
            end_date: endDate,
            status: 'confirmed'
        });

        const anomalies = [];

        for (const transaction of transactions) {
            const result = this.detectAnomalies(
                transaction.category_id,
                transaction.amount,
                transaction.type
            );

            if (result.isAnomaly) {
                anomalies.push({
                    ...transaction,
                    anomaly_reason: result.reason,
                    anomaly_details: result
                });
            }
        }

        return anomalies;
    }
}

module.exports = new AnomalyDetectorService();
