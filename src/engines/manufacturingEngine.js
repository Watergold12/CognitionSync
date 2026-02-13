/**
 * Manufacturing Rule Engine
 * Evaluates screw manufacturing telemetry against quality and safety rules.
 */

const SAFE_TONNAGE = 120; // tons
const ISO_898_HARDNESS = 240; // HV minimum
const TARGET_FURNACE_TEMP = 850; // °C

export function evaluateManufacturing(data) {
  const alerts = [];

  // Rule 1: Defect Rate
  if (data.defectPercent >= 2) {
    alerts.push({
      rule: 'Defect Rate Threshold',
      reason: `Defect rate at ${data.defectPercent.toFixed(1)}% — exceeds 2% threshold`,
      confidence: Math.min(95, 60 + data.defectPercent * 10),
      severity: data.defectPercent >= 5 ? 'critical' : 'warning',
      action: 'FLAG',
      compliance: 'ISO 3269 — Sampling & acceptance testing'
    });
  }

  // Rule 2: Furnace Temperature Deviation
  const tempDev = Math.abs(data.furnaceTemp - TARGET_FURNACE_TEMP);
  if (tempDev > 15) {
    alerts.push({
      rule: 'Furnace Temperature Deviation',
      reason: `${tempDev.toFixed(0)}°C deviation from target ${TARGET_FURNACE_TEMP}°C (±15°C allowed)`,
      confidence: Math.min(98, 70 + tempDev),
      severity: tempDev > 30 ? 'critical' : 'danger',
      action: 'REJECT',
      compliance: 'ISO 898-1 — Mechanical properties heat treatment'
    });
  }

  // Rule 3: Die Wear
  if (data.dieWear > 80) {
    alerts.push({
      rule: 'Die Wear Limit',
      reason: `Die wear at ${data.dieWear.toFixed(0)}% — exceeds 80% maintenance threshold`,
      confidence: Math.min(99, 75 + data.dieWear * 0.2),
      severity: data.dieWear > 95 ? 'critical' : 'warning',
      action: 'MAINTENANCE',
      compliance: 'Tooling maintenance schedule'
    });
  }

  // Rule 4: Machine Load
  if (data.machineLoad > SAFE_TONNAGE) {
    alerts.push({
      rule: 'Machine Load Emergency',
      reason: `Machine load ${data.machineLoad.toFixed(0)}T exceeds safe tonnage of ${SAFE_TONNAGE}T`,
      confidence: 97,
      severity: 'critical',
      action: 'EMERGENCY',
      compliance: 'Machine safety protocol — ISO 16090'
    });
  }

  // Rule 5: Hardness Check
  if (data.hardness && data.hardness < ISO_898_HARDNESS) {
    alerts.push({
      rule: 'Hardness Below ISO 898',
      reason: `Hardness ${data.hardness} HV below ISO 898 minimum of ${ISO_898_HARDNESS} HV`,
      confidence: 92,
      severity: 'danger',
      action: 'REJECT',
      compliance: 'ISO 898-1 — Mechanical properties of fasteners'
    });
  }

  return alerts;
}

export function getManufacturingStatus(data) {
  const alerts = evaluateManufacturing(data);
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasDanger = alerts.some(a => a.severity === 'danger');

  return {
    alerts,
    overallStatus: hasCritical ? 'critical' : hasDanger ? 'danger' : alerts.length > 0 ? 'warning' : 'ok',
    maintenancePrediction: estimateMaintenanceDays(data),
    complianceScore: calculateCompliance(data)
  };
}

function estimateMaintenanceDays(data) {
  const wearRate = data.dieWear / 100;
  const daysRemaining = Math.max(0, Math.round((1 - wearRate) * 30));
  return {
    daysRemaining,
    confidence: Math.round(85 - wearRate * 15),
    recommendation: daysRemaining < 5 ? 'Schedule immediate maintenance' : daysRemaining < 15 ? 'Plan maintenance within 2 weeks' : 'Normal operation'
  };
}

function calculateCompliance(data) {
  let score = 100;
  if (data.defectPercent >= 2) score -= 15;
  if (Math.abs(data.furnaceTemp - TARGET_FURNACE_TEMP) > 15) score -= 25;
  if (data.dieWear > 80) score -= 10;
  if (data.machineLoad > SAFE_TONNAGE) score -= 30;
  if (data.hardness && data.hardness < ISO_898_HARDNESS) score -= 20;
  return Math.max(0, score);
}

export function generateManufacturingData() {
  return {
    machineLoad: 80 + Math.random() * 50,
    strokeRate: 40 + Math.random() * 30,
    defectPercent: Math.random() * 4,
    furnaceTemp: 835 + Math.random() * 30,
    dieWear: 30 + Math.random() * 65,
    platingThickness: 5 + Math.random() * 10,
    hardness: 220 + Math.random() * 60,
    productionOutput: Math.round(800 + Math.random() * 400)
  };
}
