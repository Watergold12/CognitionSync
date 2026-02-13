import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

import MetricCard from '../components/MetricCard';
import ConfidenceMeter from '../components/ConfidenceMeter';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import FileUpload from '../components/FileUpload';
import DecisionLog from '../components/DecisionLog';
import HumanInLoopModal from '../components/HumanInLoopModal';
import WhatIfPanel from '../components/WhatIfPanel';
import { getDisasterStatus, generateDisasterData, evaluateDisaster } from '../engines/disasterEngine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  scales: {
    x: { grid: { color: '#1e1e1e' }, ticks: { color: '#666', font: { size: 10 } } },
    y: { grid: { color: '#1e1e1e' }, ticks: { color: '#666', font: { size: 10 } } }
  },
  plugins: {
    legend: { labels: { color: '#999', font: { size: 11 }, boxWidth: 12 } }
  }
};

const MAX_POINTS = 30;
const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });

export default function DisasterPage({ machineOn, automationOn }) {
  const [data, setData] = useState(generateDisasterData());
  const [history, setHistory] = useState({ labels: [], seismic: [], wind: [], rainfall: [], flood: [] });
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ visible: false, alerts: [] });
  const [escalationModal, setEscalationModal] = useState({ visible: false, alerts: [] });
  const [mode, setMode] = useState('live');
  const [datasetResults, setDatasetResults] = useState(null);

  // What-If
  const [whatIf, setWhatIf] = useState({
    seismicLevel: 3.0, windSpeed: 60, rainfallIntensity: 30, floodRisk: 25, populationDensity: 5000, alertSeverity: 2
  });

  const addLog = useCallback((msg, type = 'auto') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 100));
  }, []);

  // Live data loop
  useEffect(() => {
    if (!machineOn || mode !== 'live') return;
    const interval = setInterval(() => {
      const newData = generateDisasterData();
      setData(newData);

      setHistory(prev => {
        const label = ts();
        const trim = (arr) => [...arr, undefined].slice(-MAX_POINTS - 1, -1);
        return {
          labels: [...trim(prev.labels), label],
          seismic: [...trim(prev.seismic), newData.seismicLevel],
          wind: [...trim(prev.wind), newData.windSpeed],
          rainfall: [...trim(prev.rainfall), newData.rainfallIntensity],
          flood: [...trim(prev.flood), newData.floodRisk]
        };
      });

      const status = getDisasterStatus(newData);
      if (status.alerts.length > 0) {
        if (automationOn) {
          status.alerts.forEach(a => addLog(`[AUTO] ${a.action}: ${a.rule} — ${newData.sensorId} ${newData.region}`, 'alert'));
          if (status.needsEscalation) {
            setEscalationModal({ visible: true, alerts: status.alerts });
          }
        } else {
          setModal({ visible: true, alerts: status.alerts });
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [machineOn, automationOn, mode, addLog]);

  const status = getDisasterStatus(data);
  const whatIfAlerts = evaluateDisaster(whatIf);

  const handleDatasetUpload = (rows) => {
    const results = rows.map((row, i) => {
      const parsed = {
        sensorId: row.sensorId || row.sensor_id || `SENS-${i + 1}`,
        region: row.region || '',
        seismicLevel: parseFloat(row.seismicLevel || row.seismic_level || row.seismic || 0),
        windSpeed: parseFloat(row.windSpeed || row.wind_speed || row.wind || 0),
        rainfallIntensity: parseInt(row.rainfallIntensity || row.rainfall_intensity || row.rainfall || 0),
        floodRisk: parseInt(row.floodRisk || row.flood_risk || row.flood || 0),
        populationDensity: parseInt(row.populationDensity || row.population_density || row.population || 0),
        alertSeverity: parseInt(row.alertSeverity || row.alert_severity || row.severity || 1)
      };
      const st = getDisasterStatus(parsed);
      return { ...parsed, alerts: st.alerts, threatLevel: st.threatLevel, row: i + 1 };
    });
    setDatasetResults(results);
    setMode('dataset');

    setHistory({
      labels: results.map((_, i) => `R${i + 1}`),
      seismic: results.map(r => r.seismicLevel),
      wind: results.map(r => r.windSpeed),
      rainfall: results.map(r => r.rainfallIntensity),
      flood: results.map(r => r.floodRisk)
    });
    addLog(`Dataset loaded: ${results.length} sensor readings processed`, 'manual');
  };

  const lineData = {
    labels: history.labels,
    datasets: [
      { label: 'Seismic (R)', data: history.seismic, borderColor: '#b84040', backgroundColor: 'rgba(184,64,64,0.05)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true },
      { label: 'Wind (km/h)', data: history.wind, borderColor: '#5a7fa8', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Rainfall %', data: history.rainfall, borderColor: '#c49a2a', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }
    ]
  };

  const barData = {
    labels: history.labels.slice(-12),
    datasets: [{
      label: 'Flood Risk Index',
      data: history.flood.slice(-12),
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: '#444',
      borderWidth: 1
    }]
  };

  const idle = !machineOn;
  const severityLabels = ['—', 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'CRITICAL'];

  return (
    <main className="cs-page">
      <h1 className="cs-page__title">Disaster Alert System</h1>
      <p className="cs-page__subtitle">Automated emergency alert monitoring & human oversight</p>

      {!automationOn && machineOn && (
        <div className="cs-auto-disabled-banner">
          ⚠ Automation Disabled — Manual approval required before issuing public alerts
        </div>
      )}

      {/* Mode Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="cs-mode-toggle">
          <button className={`cs-mode-toggle__btn ${mode === 'live' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('live')}>Live Mode</button>
          <button className={`cs-mode-toggle__btn ${mode === 'dataset' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('dataset')}>Dataset Mode</button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Sensor: {data.sensorId} · {data.region} · Status: {idle ? 'Idle' : status.overallStatus.toUpperCase()}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="cs-grid cs-grid--6">
        <MetricCard title="Seismic Level" value={data.seismicLevel.toFixed(1)} unit="R" status={data.seismicLevel > 7 ? 'critical' : data.seismicLevel > 5 ? 'danger' : 'ok'} idle={idle} footer="Alert > 5.0 R" />
        <MetricCard title="Wind Speed" value={data.windSpeed} unit="km/h" status={data.windSpeed > 180 ? 'critical' : data.windSpeed > 120 ? 'danger' : 'ok'} idle={idle} footer="High alert > 120" />
        <MetricCard title="Rainfall" value={data.rainfallIntensity} unit="%" status={data.rainfallIntensity > 80 ? 'warning' : 'ok'} idle={idle} footer="Intensity index" />
        <MetricCard title="Flood Risk" value={data.floodRisk} unit="%" status={data.floodRisk > 70 ? 'danger' : data.floodRisk > 50 ? 'warning' : 'ok'} idle={idle} footer="Emergency > 70%" />
        <MetricCard title="Population" value={data.populationDensity.toLocaleString()} unit="/km²" status={data.populationDensity > 8000 ? 'warning' : 'ok'} idle={idle} footer="Density impact" />
        <MetricCard title="Severity" value={severityLabels[data.alertSeverity] || '—'} status={data.alertSeverity >= 4 ? 'critical' : data.alertSeverity >= 3 ? 'warning' : 'ok'} idle={idle} footer={`Level ${data.alertSeverity}/5`} />
      </div>

      {/* Charts Row */}
      <div className="cs-section-title">Sensor Trend Visualization</div>
      <div className="cs-grid cs-grid--2">
        <div className="cs-card cs-card--chart cs-relative">
          <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
            <span className="cs-idle-overlay__text">Paused</span>
          </div>
          <div className="cs-card__header">
            <span className="cs-card__title">Seismic, Wind Speed & Rainfall Trend</span>
          </div>
          <div className="cs-chart-container">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div className="cs-card cs-card--chart cs-relative">
          <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
            <span className="cs-idle-overlay__text">Paused</span>
          </div>
          <div className="cs-card__header">
            <span className="cs-card__title">Flood Risk Index</span>
          </div>
          <div className="cs-chart-container">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Decision Engine & Explainability */}
      <div className="cs-section-title">Decision Engine</div>
      <div className="cs-grid cs-grid--3">
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Threat Level Assessment</span>
            <span className={`cs-card__badge ${status.threatLevel > 70 ? 'cs-card__badge--critical' : status.threatLevel > 40 ? 'cs-card__badge--warning' : 'cs-card__badge--ok'}`}>
              {status.threatLevel > 70 ? 'EXTREME' : status.threatLevel > 40 ? 'ELEVATED' : 'NORMAL'}
            </span>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '12px' }}>
            {status.threatLevel}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cs-text-muted)', marginLeft: '4px' }}>/100</span>
          </div>
          <ConfidenceMeter label="Seismic Threat" value={Math.min(100, data.seismicLevel * 12)} />
          <ConfidenceMeter label="Cyclone Threat" value={Math.min(100, data.windSpeed * 0.5)} />
          <ConfidenceMeter label="Flood Threat" value={Math.max(data.rainfallIntensity, data.floodRisk)} />
          <ConfidenceMeter label="Population Impact" value={Math.min(100, data.populationDensity / 150)} />
        </div>

        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Alert Confidence Meter</span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--cs-text-secondary)' }}>
              Current Alert Level: <span style={{ color: data.alertSeverity >= 4 ? 'var(--cs-status-critical)' : 'var(--cs-text-primary)' }}>
                {severityLabels[data.alertSeverity]}
              </span>
            </div>
            <ConfidenceMeter label="Alert Issuance Confidence" value={status.threatLevel} />
            <ConfidenceMeter label="Sensor Data Reliability" value={Math.max(60, 95 - data.seismicLevel * 3)} />
            <ConfidenceMeter label="Prediction Accuracy" value={Math.max(50, 90 - status.alerts.length * 5)} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--cs-text-muted)' }}>
            {status.needsEscalation ? '⚠ Human escalation required for this severity level' : '✓ Within automated response threshold'}
          </div>
        </div>

        <ExplainabilityPanel alerts={status.alerts} />
      </div>

      {/* What-If & Decision Log */}
      <div className="cs-section-title">Human-Awareness Core</div>
      <div className="cs-grid cs-grid--2">
        <div>
          <WhatIfPanel
            params={[
              { key: 'seismicLevel', label: 'Seismic', min: 0, max: 10, step: 0.1, value: whatIf.seismicLevel, unit: ' R' },
              { key: 'windSpeed', label: 'Wind Speed', min: 0, max: 300, step: 5, value: whatIf.windSpeed, unit: ' km/h' },
              { key: 'rainfallIntensity', label: 'Rainfall', min: 0, max: 100, step: 1, value: whatIf.rainfallIntensity, unit: '%' },
              { key: 'floodRisk', label: 'Flood Risk', min: 0, max: 100, step: 1, value: whatIf.floodRisk, unit: '%' },
              { key: 'populationDensity', label: 'Population', min: 0, max: 20000, step: 500, value: whatIf.populationDensity, unit: '/km²' },
              { key: 'alertSeverity', label: 'Severity', min: 1, max: 5, step: 1, value: whatIf.alertSeverity }
            ]}
            onChange={(key, val) => setWhatIf(prev => ({ ...prev, [key]: val }))}
          />
          {whatIfAlerts.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <ExplainabilityPanel alerts={whatIfAlerts} />
            </div>
          )}
        </div>
        <DecisionLog logs={logs} onAddManual={(msg) => addLog(`[MANUAL OVERRIDE] ${msg}`, 'manual')} />
      </div>

      {/* File Upload */}
      <div className="cs-section-title">Sensor Data Upload</div>
      <FileUpload onDataLoaded={handleDatasetUpload} domain="disaster" />

      {/* Dataset Results */}
      {datasetResults && mode === 'dataset' && (
        <div style={{ marginTop: '16px' }}>
          <div className="cs-card cs-card--panel">
            <div className="cs-card__header">
              <span className="cs-card__title">Sensor Data Analysis</span>
              <span className="cs-card__badge cs-card__badge--info">{datasetResults.length} readings</span>
            </div>
            <div className="cs-preview-container">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>#</th><th>Sensor</th><th>Region</th><th>Seismic</th><th>Wind</th><th>Rain</th><th>Flood</th><th>Threat</th><th>Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.row}</td>
                      <td>{r.sensorId}</td>
                      <td style={{ fontSize: '11px' }}>{r.region}</td>
                      <td>{r.seismicLevel.toFixed(1)}</td>
                      <td>{r.windSpeed} km/h</td>
                      <td>{r.rainfallIntensity}%</td>
                      <td>{r.floodRisk}%</td>
                      <td>
                        <span className={`cs-card__badge ${r.threatLevel > 70 ? 'cs-card__badge--critical' : r.threatLevel > 40 ? 'cs-card__badge--warning' : 'cs-card__badge--ok'}`}>
                          {r.threatLevel}
                        </span>
                      </td>
                      <td>
                        {r.alerts.length === 0 ? <span style={{ color: 'var(--cs-status-ok)' }}>✓ OK</span> : (
                          r.alerts.map((a, j) => (
                            <span key={j} className={`cs-card__badge cs-card__badge--${a.severity}`} style={{ marginRight: '4px' }}>
                              {a.action}
                            </span>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-Loop Modal */}
      <HumanInLoopModal
        visible={modal.visible}
        title="Disaster Alert — Human Review Required"
        description="Automation is disabled. The following environmental conditions require your review before public alerts are issued."
        alerts={modal.alerts}
        onApprove={() => {
          modal.alerts.forEach(a => addLog(`[APPROVED] ${a.action}: ${a.rule}`, 'manual'));
          setModal({ visible: false, alerts: [] });
        }}
        onReject={() => {
          modal.alerts.forEach(a => addLog(`[REJECTED] ${a.action}: ${a.rule}`, 'manual'));
          setModal({ visible: false, alerts: [] });
        }}
        onClose={() => setModal({ visible: false, alerts: [] })}
      />

      {/* Escalation Modal */}
      <HumanInLoopModal
        visible={escalationModal.visible}
        title="🚨 EMERGENCY ESCALATION — PUBLIC ALERT"
        description="Critical severity detected. Human authority is required to authorize public emergency alert issuance. This cannot be auto-processed."
        alerts={escalationModal.alerts}
        onApprove={() => {
          escalationModal.alerts.forEach(a => addLog(`[ESCALATION AUTHORIZED] ${a.rule}`, 'alert'));
          setEscalationModal({ visible: false, alerts: [] });
        }}
        onClose={() => setEscalationModal({ visible: false, alerts: [] })}
      />
    </main>
  );
}
