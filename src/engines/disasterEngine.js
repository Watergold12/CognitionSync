/**
 * Disaster Alert System Rule Engine
 * Evaluates environmental sensor data against emergency thresholds.
 */

const SEISMIC_THRESHOLD = 5.0; // Richter scale
const WIND_THRESHOLD = 120; // km/h

export function evaluateDisaster(data) {
  const alerts = [];

  // Rule 1: Seismic > threshold → Issue Alert
  if (data.seismicLevel > SEISMIC_THRESHOLD) {
    alerts.push({
      rule: 'Seismic Activity Alert',
      reason: `Seismic level at ${data.seismicLevel.toFixed(1)} Richter — exceeds ${SEISMIC_THRESHOLD} threshold`,
      confidence: Math.min(97, 70 + data.seismicLevel * 4),
      severity: data.seismicLevel > 7.0 ? 'critical' : data.seismicLevel > 6.0 ? 'danger' : 'warning',
      action: 'ISSUE_ALERT',
      compliance: 'USGS Earthquake Hazards Program'
    });
  }

  // Rule 2: Wind Speed > 120 km/h → High Alert
  if (data.windSpeed > WIND_THRESHOLD) {
    alerts.push({
      rule: 'High Wind Speed Alert',
      reason: `Wind speed at ${data.windSpeed.toFixed(0)} km/h — exceeds ${WIND_THRESHOLD} km/h cyclone threshold`,
      confidence: Math.min(96, 65 + (data.windSpeed - WIND_THRESHOLD) * 0.5),
      severity: data.windSpeed > 180 ? 'critical' : 'danger',
      action: 'HIGH_ALERT',
      compliance: 'IMD Cyclone Warning Protocol'
    });
  }

  // Rule 3: Rainfall High + Flood Index High → Emergency
  if (data.rainfallIntensity > 70 && data.floodRisk > 70) {
    alerts.push({
      rule: 'Flood Emergency',
      reason: `Rainfall intensity ${data.rainfallIntensity}% + Flood risk index ${data.floodRisk}% — compound emergency`,
      confidence: Math.min(98, 75 + (data.rainfallIntensity + data.floodRisk) * 0.15),
      severity: 'critical',
      action: 'EMERGENCY',
      compliance: 'NDMA Flood Management Guidelines'
    });
  }

  // Rule 3b: Standalone high rainfall
  if (data.rainfallIntensity > 80 && data.floodRisk <= 70) {
    alerts.push({
      rule: 'Heavy Rainfall Warning',
      reason: `Rainfall intensity at ${data.rainfallIntensity}% — potential flash flood conditions`,
      confidence: Math.min(88, 60 + data.rainfallIntensity * 0.3),
      severity: 'warning',
      action: 'MONITOR',
      compliance: 'Weather monitoring protocol'
    });
  }

  // Rule 3c: Standalone high flood risk
  if (data.floodRisk > 80 && data.rainfallIntensity <= 70) {
    alerts.push({
      rule: 'Flood Risk Elevated',
      reason: `Flood risk index at ${data.floodRisk}% — riverine / reservoir risk detected`,
      confidence: Math.min(85, 55 + data.floodRisk * 0.3),
      severity: 'warning',
      action: 'MONITOR',
      compliance: 'CWC Flood forecasting standards'
    });
  }

  // Rule 4: Severity Level Critical → Human Escalation Required
  if (data.alertSeverity >= 4) {
    alerts.push({
      rule: 'Critical Severity — Human Escalation',
      reason: `Alert severity level ${data.alertSeverity}/5 — requires human authority for public alert issuance`,
      confidence: 95,
      severity: 'critical',
      action: 'ESCALATE',
      compliance: 'National Disaster Response Framework'
    });
  }

  // Rule 5: Population density impact amplifier
  if (data.populationDensity > 8000 && alerts.length > 0) {
    alerts.push({
      rule: 'High Population Density Impact',
      reason: `${data.populationDensity.toLocaleString()} people/km² in affected zone — amplified response required`,
      confidence: 90,
      severity: 'danger',
      action: 'AMPLIFY_RESPONSE',
      compliance: 'Population-weighted emergency protocol'
    });
  }

  return alerts;
}

export function getDisasterStatus(data) {
  const alerts = evaluateDisaster(data);
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasDanger = alerts.some(a => a.severity === 'danger');

  return {
    alerts,
    overallStatus: hasCritical ? 'critical' : hasDanger ? 'danger' : alerts.length > 0 ? 'warning' : 'ok',
    threatLevel: calculateThreatLevel(data),
    needsEscalation: alerts.some(a => a.action === 'ESCALATE')
  };
}

function calculateThreatLevel(data) {
  let score = 0;
  if (data.seismicLevel > 5) score += 25;
  if (data.seismicLevel > 7) score += 15;
  if (data.windSpeed > 120) score += 20;
  if (data.windSpeed > 180) score += 10;
  if (data.rainfallIntensity > 70) score += 15;
  if (data.floodRisk > 70) score += 15;
  if (data.alertSeverity >= 4) score += 20;
  if (data.populationDensity > 8000) score += 10;
  return Math.min(100, score);
}

export function generateDisasterData() {
  const severityLevel = Math.floor(1 + Math.random() * 5);
  return {
    seismicLevel: +(1 + Math.random() * 8).toFixed(1),
    windSpeed: Math.round(20 + Math.random() * 200),
    rainfallIntensity: Math.round(Math.random() * 100),
    floodRisk: Math.round(Math.random() * 100),
    populationDensity: Math.round(500 + Math.random() * 15000),
    alertSeverity: severityLevel,
    sensorId: `SENS-${String(Math.floor(100 + Math.random() * 900))}`,
    region: ['Zone A — Coastal', 'Zone B — Inland', 'Zone C — Mountain', 'Zone D — Urban', 'Zone E — River Basin'][Math.floor(Math.random() * 5)],
    timestamp: new Date().toISOString()
  };
}
