/**
 * Healthcare Patient Monitoring Rule Engine
 * Evaluates patient vitals against clinical thresholds.
 */

export function evaluatePatientVitals(vitals) {
  const alerts = [];

  // Rule 1: Blood Pressure
  if (vitals.systolic > 140 || vitals.diastolic > 90) {
    const severity = vitals.systolic > 180 || vitals.diastolic > 120 ? 'critical' : 'danger';
    alerts.push({
      rule: 'Hypertension Alert',
      reason: `BP ${vitals.systolic}/${vitals.diastolic} mmHg — exceeds 140/90 threshold`,
      confidence: Math.min(96, 70 + Math.abs(vitals.systolic - 140)),
      severity,
      action: severity === 'critical' ? 'ESCALATE' : 'ALERT',
      compliance: 'AHA/ACC Blood Pressure Guidelines 2017'
    });
  }

  // Rule 2: Heart Rate
  if (vitals.heartRate > 120) {
    alerts.push({
      rule: 'Tachycardia – Critical HR',
      reason: `Heart rate ${vitals.heartRate} bpm — exceeds 120 bpm critical threshold`,
      confidence: Math.min(95, 75 + (vitals.heartRate - 120)),
      severity: vitals.heartRate > 150 ? 'critical' : 'danger',
      action: 'CRITICAL',
      compliance: 'AHA Emergency Cardiovascular Care'
    });
  }

  // Rule 3: Blood Sugar
  if (vitals.bloodSugar > 180) {
    alerts.push({
      rule: 'Hyperglycemia Flag',
      reason: `Blood sugar ${vitals.bloodSugar} mg/dL — exceeds 180 mg/dL flag threshold`,
      confidence: Math.min(90, 65 + (vitals.bloodSugar - 180) * 0.5),
      severity: vitals.bloodSugar > 250 ? 'critical' : 'warning',
      action: 'FLAG',
      compliance: 'ADA Standards of Medical Care in Diabetes'
    });
  }

  // Rule 4: Oxygen Saturation
  if (vitals.oxygenSat < 92) {
    alerts.push({
      rule: 'Hypoxemia – SpO2 Emergency',
      reason: `SpO2 at ${vitals.oxygenSat}% — below 92% emergency threshold`,
      confidence: Math.min(99, 85 + (92 - vitals.oxygenSat) * 2),
      severity: vitals.oxygenSat < 88 ? 'critical' : 'danger',
      action: 'EMERGENCY',
      compliance: 'WHO Pulse Oximetry Guidelines'
    });
  }

  // Rule 5: Body Temperature
  if (vitals.bodyTemp > 38.5 || vitals.bodyTemp < 35) {
    const fever = vitals.bodyTemp > 38.5;
    alerts.push({
      rule: fever ? 'Fever Alert' : 'Hypothermia Alert',
      reason: `Body temp ${vitals.bodyTemp.toFixed(1)}°C — ${fever ? 'above 38.5°C' : 'below 35°C'}`,
      confidence: 78,
      severity: 'warning',
      action: 'MONITOR',
      compliance: 'Clinical temperature monitoring standards'
    });
  }

  // Rule 6: Multiple abnormal readings → Escalate
  if (alerts.length >= 2) {
    const existing = alerts.map(a => a.rule).join(', ');
    alerts.push({
      rule: 'Multi-Parameter Escalation',
      reason: `${alerts.length} concurrent abnormal readings detected: ${existing}`,
      confidence: Math.min(98, 80 + alerts.length * 5),
      severity: 'critical',
      action: 'ESCALATE',
      compliance: 'NEWS2 — National Early Warning Score'
    });
  }

  return alerts;
}

export function getHealthcareStatus(vitals) {
  const alerts = evaluatePatientVitals(vitals);
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasDanger = alerts.some(a => a.severity === 'danger');

  return {
    alerts,
    overallStatus: hasCritical ? 'critical' : hasDanger ? 'danger' : alerts.length > 0 ? 'warning' : 'ok',
    riskScore: calculatePatientRisk(vitals),
    needsEscalation: alerts.some(a => a.action === 'ESCALATE')
  };
}

function calculatePatientRisk(vitals) {
  let score = 10;
  if (vitals.systolic > 140) score += 20;
  if (vitals.systolic > 180) score += 15;
  if (vitals.heartRate > 120) score += 25;
  if (vitals.bloodSugar > 180) score += 15;
  if (vitals.oxygenSat < 92) score += 30;
  if (vitals.bodyTemp > 38.5 || vitals.bodyTemp < 35) score += 10;
  return Math.min(100, score);
}

export function generateHealthcareData() {
  return {
    heartRate: Math.round(60 + Math.random() * 80),
    systolic: Math.round(100 + Math.random() * 60),
    diastolic: Math.round(60 + Math.random() * 40),
    bloodSugar: Math.round(70 + Math.random() * 150),
    oxygenSat: Math.round(88 + Math.random() * 12),
    bodyTemp: +(36 + Math.random() * 3).toFixed(1),
    patientId: `PT-${String(Math.floor(1000 + Math.random() * 9000))}`,
    timestamp: new Date().toISOString()
  };
}
