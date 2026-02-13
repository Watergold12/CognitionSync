import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import MetricCard from '../components/MetricCard';
import ConfidenceMeter from '../components/ConfidenceMeter';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import FileUpload from '../components/FileUpload';
import DecisionLog from '../components/DecisionLog';
import HumanInLoopModal from '../components/HumanInLoopModal';
import WhatIfPanel from '../components/WhatIfPanel';
import { getHealthcareStatus, generateHealthcareData, evaluatePatientVitals } from '../engines/healthcareEngine';

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

export default function HealthcarePage({ machineOn, automationOn }) {
  const [data, setData] = useState(generateHealthcareData());
  const [history, setHistory] = useState({ labels: [], hr: [], systolic: [], diastolic: [], sugar: [], spo2: [] });
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ visible: false, alerts: [], type: 'review' });
  const [escalationModal, setEscalationModal] = useState({ visible: false, alerts: [] });
  const [mode, setMode] = useState('live');
  const [datasetResults, setDatasetResults] = useState(null);
  const [doctorNotes, setDoctorNotes] = useState([]);
  const [doctorNote, setDoctorNote] = useState('');

  // What-If
  const [whatIf, setWhatIf] = useState({
    heartRate: 80, systolic: 120, diastolic: 80, bloodSugar: 100, oxygenSat: 97, bodyTemp: 36.8
  });

  const addLog = useCallback((msg, type = 'auto') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 100));
  }, []);

  // Live data loop
  useEffect(() => {
    if (!machineOn || mode !== 'live') return;
    const interval = setInterval(() => {
      const newData = generateHealthcareData();
      setData(newData);

      setHistory(prev => {
        const label = ts();
        const trim = (arr) => [...arr, undefined].slice(-MAX_POINTS - 1, -1);
        return {
          labels: [...trim(prev.labels), label],
          hr: [...trim(prev.hr), newData.heartRate],
          systolic: [...trim(prev.systolic), newData.systolic],
          diastolic: [...trim(prev.diastolic), newData.diastolic],
          sugar: [...trim(prev.sugar), newData.bloodSugar],
          spo2: [...trim(prev.spo2), newData.oxygenSat]
        };
      });

      const status = getHealthcareStatus(newData);
      if (status.alerts.length > 0) {
        if (automationOn) {
          status.alerts.forEach(a => addLog(`[AUTO] ${a.action}: ${a.rule} — ${newData.patientId}`, 'alert'));
          if (status.needsEscalation) {
            setEscalationModal({ visible: true, alerts: status.alerts });
          }
        } else {
          setModal({ visible: true, alerts: status.alerts, type: 'review' });
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [machineOn, automationOn, mode, addLog]);

  const status = getHealthcareStatus(data);
  const whatIfAlerts = evaluatePatientVitals(whatIf);

  const handleDatasetUpload = (rows) => {
    const results = rows.map((row, i) => {
      const parsed = {
        heartRate: parseFloat(row.heartRate || row.heart_rate || row.hr || 0),
        systolic: parseFloat(row.systolic || row.bp_systolic || 0),
        diastolic: parseFloat(row.diastolic || row.bp_diastolic || 0),
        bloodSugar: parseFloat(row.bloodSugar || row.blood_sugar || row.sugar || 0),
        oxygenSat: parseFloat(row.oxygenSat || row.oxygen || row.spo2 || 0),
        bodyTemp: parseFloat(row.bodyTemp || row.body_temp || row.temp || 0),
        patientId: row.patientId || row.patient_id || `PT-${i + 1}`
      };
      const st = getHealthcareStatus(parsed);
      return { ...parsed, alerts: st.alerts, riskScore: st.riskScore, row: i + 1 };
    });
    setDatasetResults(results);
    setMode('dataset');

    setHistory({
      labels: results.map((_, i) => `P${i + 1}`),
      hr: results.map(r => r.heartRate),
      systolic: results.map(r => r.systolic),
      diastolic: results.map(r => r.diastolic),
      sugar: results.map(r => r.bloodSugar),
      spo2: results.map(r => r.oxygenSat)
    });
    addLog(`Patient dataset loaded: ${results.length} records processed`, 'manual');
  };

  const addDoctorNote = () => {
    if (doctorNote.trim()) {
      setDoctorNotes(prev => [{ time: ts(), note: doctorNote.trim(), doctor: 'Dr. Review' }, ...prev]);
      addLog(`[DOCTOR] Intervention note: ${doctorNote.trim()}`, 'manual');
      setDoctorNote('');
    }
  };

  const lineData = {
    labels: history.labels,
    datasets: [
      { label: 'HR (bpm)', data: history.hr, borderColor: '#b84040', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Systolic', data: history.systolic, borderColor: '#5a7fa8', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Diastolic', data: history.diastolic, borderColor: '#666', backgroundColor: 'transparent', borderWidth: 1, pointRadius: 0, tension: 0.3, borderDash: [4, 4] },
      { label: 'Sugar', data: history.sugar, borderColor: '#c49a2a', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }
    ]
  };

  const spo2Data = {
    labels: history.labels,
    datasets: [
      { label: 'SpO2 (%)', data: history.spo2, borderColor: '#4a9e6d', backgroundColor: 'rgba(74,158,109,0.05)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }
    ]
  };

  const idle = !machineOn;

  return (
    <main className="cs-page">
      <h1 className="cs-page__title">Healthcare Monitoring</h1>
      <p className="cs-page__subtitle">Patient vital signs & clinical decision support</p>

      {!automationOn && machineOn && (
        <div className="cs-auto-disabled-banner">
          ⚠ Automation Disabled — Manual approval required for all clinical decisions
        </div>
      )}

      {/* Mode Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="cs-mode-toggle">
          <button className={`cs-mode-toggle__btn ${mode === 'live' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('live')}>Live Mode</button>
          <button className={`cs-mode-toggle__btn ${mode === 'dataset' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('dataset')}>Dataset Mode</button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Patient: {data.patientId} · Status: {idle ? 'Idle' : status.overallStatus.toUpperCase()}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="cs-grid cs-grid--6" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <MetricCard title="Heart Rate" value={data.heartRate} unit="bpm" status={data.heartRate > 120 ? 'critical' : data.heartRate > 100 ? 'warning' : 'ok'} idle={idle} footer="Critical > 120" />
        <MetricCard title="Blood Pressure" value={`${data.systolic}/${data.diastolic}`} unit="mmHg" status={data.systolic > 140 || data.diastolic > 90 ? 'danger' : 'ok'} idle={idle} footer="Alert > 140/90" />
        <MetricCard title="Blood Sugar" value={data.bloodSugar} unit="mg/dL" status={data.bloodSugar > 180 ? 'warning' : 'ok'} idle={idle} footer="Flag > 180" />
        <MetricCard title="SpO2" value={data.oxygenSat} unit="%" status={data.oxygenSat < 92 ? 'critical' : data.oxygenSat < 95 ? 'warning' : 'ok'} idle={idle} footer="Emergency < 92%" />
        <MetricCard title="Body Temp" value={data.bodyTemp.toFixed(1)} unit="°C" status={data.bodyTemp > 38.5 ? 'warning' : data.bodyTemp < 35 ? 'danger' : 'ok'} idle={idle} footer="Normal: 36.1–37.2" />
      </div>

      {/* Charts Row */}
      <div className="cs-section-title">Live Trend Visualization</div>
      <div className="cs-grid cs-grid--2">
        <div className="cs-card cs-card--chart cs-relative">
          <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
            <span className="cs-idle-overlay__text">Paused</span>
          </div>
          <div className="cs-card__header">
            <span className="cs-card__title">HR, BP & Blood Sugar Trend</span>
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
            <span className="cs-card__title">Oxygen Saturation</span>
          </div>
          <div className="cs-chart-container">
            <Line data={spo2Data} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Risk & Alerts */}
      <div className="cs-section-title">Clinical Decision Support</div>
      <div className="cs-grid cs-grid--3">
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Patient Risk Score</span>
            <span className={`cs-card__badge ${status.riskScore > 70 ? 'cs-card__badge--critical' : status.riskScore > 40 ? 'cs-card__badge--warning' : 'cs-card__badge--ok'}`}>
              {status.riskScore > 70 ? 'HIGH' : status.riskScore > 40 ? 'MODERATE' : 'LOW'}
            </span>
          </div>
          <div style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', marginBottom: '12px' }}>
            {status.riskScore}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cs-text-muted)', marginLeft: '4px' }}>/100</span>
          </div>
          <ConfidenceMeter label="Cardiovascular" value={Math.min(100, Math.max(0, (data.heartRate - 60) * 1.5 + (data.systolic - 100) * 0.8))} />
          <ConfidenceMeter label="Metabolic" value={Math.min(100, Math.max(0, (data.bloodSugar - 70) * 0.5))} />
          <ConfidenceMeter label="Respiratory" value={Math.min(100, Math.max(0, (100 - data.oxygenSat) * 8))} />
        </div>

        {/* Doctor Intervention Logging */}
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Doctor Intervention Log</span>
          </div>
          <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '12px' }}>
            {doctorNotes.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)' }}>No interventions logged.</div>
            )}
            {doctorNotes.map((n, i) => (
              <div key={i} className="cs-log-entry cs-log-entry--manual">
                <div className="cs-log-entry__time">{n.time} · {n.doctor}</div>
                <div className="cs-log-entry__msg">{n.note}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="cs-input"
              placeholder="Add doctor's note..."
              value={doctorNote}
              onChange={e => setDoctorNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDoctorNote()}
            />
            <button className="cs-btn" onClick={addDoctorNote}>Log</button>
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
              { key: 'heartRate', label: 'Heart Rate', min: 40, max: 200, step: 1, value: whatIf.heartRate, unit: ' bpm' },
              { key: 'systolic', label: 'Systolic BP', min: 80, max: 220, step: 1, value: whatIf.systolic, unit: ' mmHg' },
              { key: 'diastolic', label: 'Diastolic BP', min: 40, max: 140, step: 1, value: whatIf.diastolic, unit: ' mmHg' },
              { key: 'bloodSugar', label: 'Blood Sugar', min: 40, max: 400, step: 1, value: whatIf.bloodSugar, unit: ' mg/dL' },
              { key: 'oxygenSat', label: 'SpO2', min: 70, max: 100, step: 1, value: whatIf.oxygenSat, unit: '%' },
              { key: 'bodyTemp', label: 'Body Temp', min: 33, max: 42, step: 0.1, value: whatIf.bodyTemp, unit: '°C' }
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
      <div className="cs-section-title">Patient Data Upload</div>
      <FileUpload onDataLoaded={handleDatasetUpload} domain="healthcare" />

      {/* Dataset Results */}
      {datasetResults && mode === 'dataset' && (
        <div style={{ marginTop: '16px' }}>
          <div className="cs-card cs-card--panel">
            <div className="cs-card__header">
              <span className="cs-card__title">Patient Dataset Analysis</span>
              <span className="cs-card__badge cs-card__badge--info">{datasetResults.length} patients</span>
            </div>
            <div className="cs-preview-container">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>#</th><th>Patient</th><th>HR</th><th>BP</th><th>Sugar</th><th>SpO2</th><th>Risk</th><th>Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.row}</td>
                      <td>{r.patientId}</td>
                      <td>{r.heartRate}</td>
                      <td>{r.systolic}/{r.diastolic}</td>
                      <td>{r.bloodSugar}</td>
                      <td>{r.oxygenSat}%</td>
                      <td>
                        <span className={`cs-card__badge ${r.riskScore > 70 ? 'cs-card__badge--critical' : r.riskScore > 40 ? 'cs-card__badge--warning' : 'cs-card__badge--ok'}`}>
                          {r.riskScore}
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
        title="Clinical Alert — Human Review Required"
        description="Automation is disabled. The following patient conditions require your clinical review."
        alerts={modal.alerts}
        onApprove={() => {
          modal.alerts.forEach(a => addLog(`[APPROVED] ${a.action}: ${a.rule}`, 'manual'));
          setModal({ visible: false, alerts: [], type: 'review' });
        }}
        onReject={() => {
          modal.alerts.forEach(a => addLog(`[REJECTED] ${a.action}: ${a.rule}`, 'manual'));
          setModal({ visible: false, alerts: [], type: 'review' });
        }}
        onClose={() => setModal({ visible: false, alerts: [], type: 'review' })}
      />

      {/* Escalation Modal */}
      <HumanInLoopModal
        visible={escalationModal.visible}
        title="🚨 EMERGENCY ESCALATION"
        description="Multiple critical parameters detected. Immediate clinical intervention required. This alert has been auto-escalated."
        alerts={escalationModal.alerts}
        onApprove={() => {
          escalationModal.alerts.forEach(a => addLog(`[ESCALATION ACKNOWLEDGED] ${a.rule}`, 'alert'));
          setEscalationModal({ visible: false, alerts: [] });
        }}
        onClose={() => setEscalationModal({ visible: false, alerts: [] })}
      />
    </main>
  );
}
