/**
 * Credit Card Transaction Rule Engine
 * Evaluates transactions against fraud detection rules.
 */

const AMOUNT_THRESHOLD = 5000;

export function evaluateCreditTransaction(txn) {
    const alerts = [];

    // Rule 1: High amount + foreign location
    if (txn.amount > AMOUNT_THRESHOLD && txn.locationMismatch) {
        alerts.push({
            rule: 'High Amount + Foreign Location',
            reason: `$${txn.amount.toLocaleString()} transaction from mismatched location`,
            confidence: Math.min(95, 70 + (txn.amount / AMOUNT_THRESHOLD) * 10),
            severity: 'danger',
            action: 'FLAG',
            compliance: 'PCI-DSS Requirement 10 — Track and monitor all access'
        });
    }

    // Rule 2: Frequency spike
    if (txn.frequencyPerMin >= 5) {
        alerts.push({
            rule: 'Transaction Frequency Spike',
            reason: `${txn.frequencyPerMin} transactions in 1 minute — possible card testing`,
            confidence: 88,
            severity: 'warning',
            action: 'HUMAN_REVIEW',
            compliance: 'PCI-DSS Requirement 10.6 — Review logs daily'
        });
    }

    // Rule 3: Risk Score
    if (txn.riskScore > 85) {
        alerts.push({
            rule: 'High Risk Score',
            reason: `Fraud risk score at ${txn.riskScore}% — exceeds 85% block threshold`,
            confidence: txn.riskScore,
            severity: 'critical',
            action: 'BLOCK',
            compliance: 'PCI-DSS Requirement 11 — Regular security testing'
        });
    }

    // Rule 4: Suspicious merchant
    if (txn.merchantRisk === 'high') {
        alerts.push({
            rule: 'Suspicious Merchant Category',
            reason: `Transaction at high-risk merchant category: ${txn.merchantCategory || 'Unknown'}`,
            confidence: 72,
            severity: 'warning',
            action: 'FLAG',
            compliance: 'PCI-DSS Requirement 12 — Information security policy'
        });
    }

    // Rule 5: Time-of-day anomaly
    if (txn.timeAnomaly) {
        alerts.push({
            rule: 'Unusual Transaction Time',
            reason: `Transaction at unusual hour (${txn.hour}:00) for this cardholder`,
            confidence: 55,
            severity: 'info',
            action: 'MONITOR',
            compliance: 'Behavioral analytics baseline'
        });
    }

    return alerts;
}

export function getCreditStatus(txn) {
    const alerts = evaluateCreditTransaction(txn);
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasDanger = alerts.some(a => a.severity === 'danger');

    return {
        alerts,
        overallStatus: hasCritical ? 'critical' : hasDanger ? 'danger' : alerts.length > 0 ? 'warning' : 'ok',
        fraudConfidence: calculateFraudConfidence(txn),
        riskTrend: 'stable'
    };
}

function calculateFraudConfidence(txn) {
    let score = txn.riskScore || 20;
    if (txn.locationMismatch) score += 15;
    if (txn.frequencyPerMin >= 5) score += 10;
    if (txn.merchantRisk === 'high') score += 10;
    if (txn.timeAnomaly) score += 5;
    return Math.min(100, score);
}

export function generateCreditData() {
    const merchants = ['Electronics', 'Grocery', 'Gas Station', 'Online Retail', 'Jewelry', 'Cash Advance', 'Travel'];
    const merchantRisks = ['low', 'low', 'low', 'medium', 'high', 'high', 'medium'];
    const idx = Math.floor(Math.random() * merchants.length);
    const hour = Math.floor(Math.random() * 24);

    return {
        amount: Math.round(50 + Math.random() * 8000),
        locationMismatch: Math.random() > 0.7,
        frequencyPerMin: Math.floor(Math.random() * 8),
        merchantCategory: merchants[idx],
        merchantRisk: merchantRisks[idx],
        riskScore: Math.round(10 + Math.random() * 90),
        timeAnomaly: hour < 5 || hour > 23,
        hour,
        cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
        timestamp: new Date().toISOString()
    };
}
