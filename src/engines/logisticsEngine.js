/**
 * Logistics Shipment Routing Rule Engine
 * Evaluates automated routing decisions against operational thresholds.
 */

const FUEL_THRESHOLD = 45; // liters per 100km

export function evaluateLogistics(data) {
  const alerts = [];

  // Rule 1: Delay > 60 min → Flag
  if (data.delayTime > 60) {
    alerts.push({
      rule: 'Shipment Delay Threshold',
      reason: `Delay at ${data.delayTime} min — exceeds 60 min acceptable window`,
      confidence: Math.min(96, 65 + data.delayTime * 0.3),
      severity: data.delayTime > 120 ? 'critical' : 'warning',
      action: 'FLAG',
      compliance: 'SLA Compliance — Delivery time agreement'
    });
  }

  // Rule 2: Route Efficiency < 70% → Recalculate
  if (data.routeEfficiency < 70) {
    alerts.push({
      rule: 'Route Efficiency Below Threshold',
      reason: `Route efficiency at ${data.routeEfficiency.toFixed(1)}% — below 70% recalculation threshold`,
      confidence: Math.min(94, 60 + (70 - data.routeEfficiency) * 2),
      severity: data.routeEfficiency < 50 ? 'critical' : 'danger',
      action: 'RECALCULATE',
      compliance: 'Fleet optimization protocol'
    });
  }

  // Rule 3: Weather Risk High → Human Review
  if (data.weatherRisk > 70) {
    alerts.push({
      rule: 'High Weather Risk',
      reason: `Weather risk index at ${data.weatherRisk}% — adverse conditions detected on route`,
      confidence: Math.min(92, 55 + data.weatherRisk * 0.4),
      severity: data.weatherRisk > 85 ? 'critical' : 'warning',
      action: 'HUMAN_REVIEW',
      compliance: 'Safety-first routing policy'
    });
  }

  // Rule 4: Fuel Spike > threshold → Maintenance Alert
  if (data.fuelConsumption > FUEL_THRESHOLD) {
    alerts.push({
      rule: 'Fuel Consumption Spike',
      reason: `Fuel usage at ${data.fuelConsumption.toFixed(1)} L/100km — exceeds ${FUEL_THRESHOLD} L/100km threshold`,
      confidence: Math.min(90, 68 + (data.fuelConsumption - FUEL_THRESHOLD) * 1.5),
      severity: 'warning',
      action: 'MAINTENANCE',
      compliance: 'Vehicle efficiency maintenance schedule'
    });
  }

  // Rule 5: Vehicle Health < 50% → Stop Shipment
  if (data.vehicleHealth < 50) {
    alerts.push({
      rule: 'Vehicle Health Critical',
      reason: `Vehicle health score at ${data.vehicleHealth}% — below 50% operational minimum`,
      confidence: Math.min(98, 80 + (50 - data.vehicleHealth)),
      severity: data.vehicleHealth < 25 ? 'critical' : 'danger',
      action: 'STOP_SHIPMENT',
      compliance: 'DOT vehicle safety regulations'
    });
  }

  return alerts;
}

export function getLogisticsStatus(data) {
  const alerts = evaluateLogistics(data);
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasDanger = alerts.some(a => a.severity === 'danger');

  return {
    alerts,
    overallStatus: hasCritical ? 'critical' : hasDanger ? 'danger' : alerts.length > 0 ? 'warning' : 'ok',
    operationalScore: calculateOperationalScore(data),
    etaConfidence: calculateEtaConfidence(data)
  };
}

function calculateOperationalScore(data) {
  let score = 100;
  if (data.delayTime > 60) score -= 20;
  if (data.routeEfficiency < 70) score -= 25;
  if (data.weatherRisk > 70) score -= 15;
  if (data.fuelConsumption > FUEL_THRESHOLD) score -= 10;
  if (data.vehicleHealth < 50) score -= 30;
  return Math.max(0, score);
}

function calculateEtaConfidence(data) {
  let confidence = 95;
  if (data.delayTime > 30) confidence -= 15;
  if (data.weatherRisk > 50) confidence -= 10;
  if (data.routeEfficiency < 80) confidence -= 10;
  if (data.vehicleHealth < 60) confidence -= 10;
  return Math.max(10, confidence);
}

const LOCATIONS = [
  'Mumbai Warehouse', 'Delhi Hub', 'Chennai Port', 'Kolkata Depot',
  'Bangalore DC', 'Hyderabad Terminal', 'Pune Gateway', 'Ahmedabad Yard'
];

const DESTINATIONS = [
  'Jaipur Central', 'Lucknow North', 'Kochi Harbor', 'Patna East',
  'Guwahati Hub', 'Bhopal West', 'Chandigarh DC', 'Nagpur Junction'
];

export function generateLogisticsData() {
  const locIdx = Math.floor(Math.random() * LOCATIONS.length);
  let destIdx = Math.floor(Math.random() * DESTINATIONS.length);

  return {
    shipmentId: `SHP-${String(Math.floor(10000 + Math.random() * 90000))}`,
    currentLocation: LOCATIONS[locIdx],
    destination: DESTINATIONS[destIdx],
    routeEfficiency: 50 + Math.random() * 50,
    delayTime: Math.round(Math.random() * 150),
    fuelConsumption: 25 + Math.random() * 35,
    vehicleHealth: Math.round(20 + Math.random() * 80),
    weatherRisk: Math.round(Math.random() * 100),
    timestamp: new Date().toISOString()
  };
}
