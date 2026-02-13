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
import { getLogisticsStatus, generateLogisticsData, evaluateLogistics } from '../engines/logisticsEngine';

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

export default function LogisticsPage({ machineOn, automationOn }) {
  const [data, setData] = useState(generateLogisticsData());
  const [history, setHistory] = useState({ labels: [], delay: [], efficiency: [], fuel: [], vehicleHealth: [] });
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ visible: false, alerts: [] });
  const [mode, setMode] = useState('live');
  const [datasetResults, setDatasetResults] = useState(null);
  const [shipmentLog, setShipmentLog] = useState([]);

  // What-If
  const [whatIf, setWhatIf] = useState({
    delayTime: 30, routeEfficiency: 80, weatherRisk: 25, fuelConsumption: 35, vehicleHealth: 75
  });

  const addLog = useCallback((msg, type = 'auto') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 100));
  }, []);

  // Live data loop
  useEffect(() => {
    if (!machineOn || mode !== 'live') return;
    const interval = setInterval(() => {
      const newData = generateLogisticsData();
      setData(newData);

      setShipmentLog(prev => [...prev, newData].slice(-50));

      setHistory(prev => {
        const label = ts();
        const trim = (arr) => [...arr, undefined].slice(-MAX_POINTS - 1, -1);
        return {
          labels: [...trim(prev.labels), label],
          delay: [...trim(prev.delay), newData.delayTime],
          efficiency: [...trim(prev.efficiency), newData.routeEfficiency],
          fuel: [...trim(prev.fuel), newData.fuelConsumption],
          vehicleHealth: [...trim(prev.vehicleHealth), newData.vehicleHealth]
        };
      });

      const status = getLogisticsStatus(newData);
      if (status.alerts.length > 0) {
        if (automationOn) {
          status.alerts.forEach(a => addLog(`[AUTO] ${a.action}: ${a.rule} — ${newData.shipmentId}`, 'alert'));
        } else {
          setModal({ visible: true, alerts: status.alerts });
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [machineOn, automationOn, mode, addLog]);

  const status = getLogisticsStatus(data);
  const whatIfAlerts = evaluateLogistics(whatIf);

  const handleDatasetUpload = (rows) => {
    const results = rows.map((row, i) => {
      const parsed = {
        shipmentId: row.shipmentId || row.shipment_id || `SHP-${i + 1}`,
        currentLocation: row.currentLocation || row.current_location || row.location || '',
        destination: row.destination || '',
        routeEfficiency: parseFloat(row.routeEfficiency || row.route_efficiency || 0),
        delayTime: parseInt(row.delayTime || row.delay_time || row.delay || 0),
        fuelConsumption: parseFloat(row.fuelConsumption || row.fuel_consumption || row.fuel || 0),
        vehicleHealth: parseInt(row.vehicleHealth || row.vehicle_health || 0),
        weatherRisk: parseInt(row.weatherRisk || row.weather_risk || row.weather || 0)
      };
      return { ...parsed, alerts: evaluateLogistics(parsed), row: i + 1 };
    });
    setDatasetResults(results);
    setMode('dataset');

    setHistory({
      labels: results.map((_, i) => `S${i + 1}`),
      delay: results.map(r => r.delayTime),
      efficiency: results.map(r => r.routeEfficiency),
      fuel: results.map(r => r.fuelConsumption),
      vehicleHealth: results.map(r => r.vehicleHealth)
    });
    addLog(`Dataset loaded: ${results.length} shipments processed`, 'manual');
  };

  const lineData = {
    labels: history.labels,
    datasets: [
      { label: 'Delay (min)', data: history.delay, borderColor: '#b84040', backgroundColor: 'rgba(184,64,64,0.05)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true },
      { label: 'Efficiency %', data: history.efficiency, borderColor: '#4a9e6d', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Vehicle Health %', data: history.vehicleHealth, borderColor: '#5a7fa8', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }
    ]
  };

  const barData = {
    labels: history.labels.slice(-12),
    datasets: [{
      label: 'Fuel (L/100km)',
      data: history.fuel.slice(-12),
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: '#444',
      borderWidth: 1
    }]
  };

  const idle = !machineOn;

  return (
    <main className="cs-page">
      <h1 className="cs-page__title">Logistics Shipment Routing</h1>
      <p className="cs-page__subtitle">Automated routing decision monitoring & situational awareness</p>

      {!automationOn && machineOn && (
        <div className="cs-auto-disabled-banner">
          ⚠ Automation Disabled — Manual approval required for all routing decisions
        </div>
      )}

      {/* Mode Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="cs-mode-toggle">
          <button className={`cs-mode-toggle__btn ${mode === 'live' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('live')}>Live Mode</button>
          <button className={`cs-mode-toggle__btn ${mode === 'dataset' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('dataset')}>Dataset Mode</button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Shipment: {data.shipmentId} · Status: {idle ? 'Idle' : status.overallStatus.toUpperCase()}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="cs-grid cs-grid--4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MetricCard title="Route Efficiency" value={data.routeEfficiency.toFixed(1)} unit="%" status={data.routeEfficiency < 70 ? 'danger' : data.routeEfficiency < 80 ? 'warning' : 'ok'} idle={idle} footer="Recalculate < 70%" />
        <MetricCard title="Delay Time" value={data.delayTime} unit="min" status={data.delayTime > 60 ? 'warning' : 'ok'} idle={idle} footer="Flag > 60 min" />
        <MetricCard title="Fuel Consumption" value={data.fuelConsumption.toFixed(1)} unit="L/100km" status={data.fuelConsumption > 45 ? 'warning' : 'ok'} idle={idle} footer="Threshold: 45" />
        <MetricCard title="Vehicle Health" value={data.vehicleHealth} unit="%" status={data.vehicleHealth < 50 ? 'critical' : data.vehicleHealth < 70 ? 'warning' : 'ok'} idle={idle} footer="Stop < 50%" />
      </div>
      <div className="cs-grid cs-grid--4" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '16px' }}>
        <MetricCard title="Weather Risk" value={data.weatherRisk} unit="%" status={data.weatherRisk > 70 ? 'danger' : data.weatherRisk > 50 ? 'warning' : 'ok'} idle={idle} footer="Review > 70%" />
        <MetricCard title="Current Location" value={data.currentLocation} status="info" idle={idle} footer="Origin hub" />
        <MetricCard title="Destination" value={data.destination} status="info" idle={idle} footer="Delivery point" />
        <MetricCard title="Shipment ID" value={data.shipmentId} status="info" idle={idle} footer="Active tracking" />
      </div>

      {/* Charts Row */}
      <div className="cs-section-title">Visualization</div>
      <div className="cs-grid cs-grid--2">
        <div className="cs-card cs-card--chart cs-relative">
          <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
            <span className="cs-idle-overlay__text">Paused</span>
          </div>
          <div className="cs-card__header">
            <span className="cs-card__title">Delay, Efficiency & Vehicle Health Trend</span>
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
            <span className="cs-card__title">Fuel Consumption</span>
          </div>
          <div className="cs-chart-container">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Decision Intelligence & Explainability */}
      <div className="cs-section-title">Decision Intelligence</div>
      <div className="cs-grid cs-grid--3">
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Operational Score</span>
            <span className={`cs-card__badge ${status.operationalScore >= 80 ? 'cs-card__badge--ok' : status.operationalScore >= 50 ? 'cs-card__badge--warning' : 'cs-card__badge--danger'}`}>
              {status.operationalScore >= 80 ? 'OPTIMAL' : status.operationalScore >= 50 ? 'DEGRADED' : 'CRITICAL'}
            </span>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '12px' }}>
            {status.operationalScore}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cs-text-muted)', marginLeft: '4px' }}>/100</span>
          </div>
          <ConfidenceMeter label="Route Optimization" value={Math.min(100, data.routeEfficiency)} />
          <ConfidenceMeter label="ETA Confidence" value={status.etaConfidence} />
          <ConfidenceMeter label="Fleet Readiness" value={data.vehicleHealth} />
        </div>

        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Shipment Tracker</span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {shipmentLog.slice(-8).reverse().map((s, i) => (
              <div key={i} className={`cs-log-entry ${s.delayTime > 60 ? 'cs-log-entry--alert' : s.routeEfficiency < 70 ? 'cs-log-entry--manual' : 'cs-log-entry--auto'}`}>
                <div className="cs-log-entry__time">{s.shipmentId} · {s.currentLocation} → {s.destination}</div>
                <div className="cs-log-entry__msg">Eff: {s.routeEfficiency.toFixed(0)}% · Delay: {s.delayTime}min · Weather: {s.weatherRisk}%</div>
              </div>
            ))}
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
              { key: 'delayTime', label: 'Delay Time', min: 0, max: 200, step: 5, value: whatIf.delayTime, unit: ' min' },
              { key: 'routeEfficiency', label: 'Route Eff.', min: 0, max: 100, step: 1, value: whatIf.routeEfficiency, unit: '%' },
              { key: 'weatherRisk', label: 'Weather Risk', min: 0, max: 100, step: 1, value: whatIf.weatherRisk, unit: '%' },
              { key: 'fuelConsumption', label: 'Fuel', min: 15, max: 80, step: 1, value: whatIf.fuelConsumption, unit: ' L' },
              { key: 'vehicleHealth', label: 'Vehicle Health', min: 0, max: 100, step: 1, value: whatIf.vehicleHealth, unit: '%' }
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
      <div className="cs-section-title">Data Upload</div>
      <FileUpload onDataLoaded={handleDatasetUpload} domain="logistics" />

      {/* Dataset Results */}
      {datasetResults && mode === 'dataset' && (
        <div style={{ marginTop: '16px' }}>
          <div className="cs-card cs-card--panel">
            <div className="cs-card__header">
              <span className="cs-card__title">Shipment Analysis Results</span>
              <span className="cs-card__badge cs-card__badge--info">{datasetResults.length} shipments</span>
            </div>
            <div className="cs-preview-container">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>#</th><th>Shipment</th><th>Route</th><th>Eff%</th><th>Delay</th><th>Vehicle</th><th>Weather</th><th>Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.row}</td>
                      <td>{r.shipmentId}</td>
                      <td style={{ fontSize: '11px' }}>{r.currentLocation} → {r.destination}</td>
                      <td>{r.routeEfficiency.toFixed(0)}%</td>
                      <td>{r.delayTime}min</td>
                      <td>{r.vehicleHealth}%</td>
                      <td>{r.weatherRisk}%</td>
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
        title="Routing Alert — Human Review Required"
        description="Automation is disabled. The following routing conditions require your manual approval."
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
    </main>
  );
}
