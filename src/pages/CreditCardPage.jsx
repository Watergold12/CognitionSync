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
import { getCreditStatus, generateCreditData, evaluateCreditTransaction } from '../engines/creditEngine';

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

export default function CreditCardPage({ machineOn, automationOn }) {
  const [data, setData] = useState(generateCreditData());
  const [history, setHistory] = useState({ labels: [], risk: [], amount: [] });
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState({ visible: false, alerts: [] });
  const [mode, setMode] = useState('live');
  const [datasetResults, setDatasetResults] = useState(null);
  const [txnTimeline, setTxnTimeline] = useState([]);

  // What-If
  const [whatIf, setWhatIf] = useState({
    amount: 3000, riskScore: 50, frequencyPerMin: 2, locationMismatch: false,
    merchantRisk: 'low', timeAnomaly: false, hour: 12
  });

  const addLog = useCallback((msg, type = 'auto') => {
    setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 100));
  }, []);

  // Live data loop
  useEffect(() => {
    if (!machineOn || mode !== 'live') return;
    const interval = setInterval(() => {
      const newData = generateCreditData();
      setData(newData);

      setTxnTimeline(prev => [...prev, newData].slice(-50));

      setHistory(prev => {
        const label = ts();
        const trim = (arr) => [...arr, undefined].slice(-MAX_POINTS - 1, -1);
        return {
          labels: [...trim(prev.labels), label],
          risk: [...trim(prev.risk), newData.riskScore],
          amount: [...trim(prev.amount), newData.amount]
        };
      });

      const status = getCreditStatus(newData);
      if (status.alerts.length > 0) {
        if (automationOn) {
          status.alerts.forEach(a => addLog(`[AUTO] ${a.action}: ${a.rule} — Card ****${newData.cardLast4}`, 'alert'));
        } else {
          setModal({ visible: true, alerts: status.alerts });
        }
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [machineOn, automationOn, mode, addLog]);

  const status = getCreditStatus(data);
  const whatIfAlerts = evaluateCreditTransaction(whatIf);

  const handleDatasetUpload = (rows) => {
    const results = rows.map((row, i) => {
      const parsed = {
        amount: parseFloat(row.amount || 0),
        locationMismatch: row.locationMismatch === true || row.locationMismatch === 'true' || row.location_mismatch === true,
        frequencyPerMin: parseInt(row.frequencyPerMin || row.frequency || 0),
        merchantCategory: row.merchantCategory || row.merchant || '',
        merchantRisk: row.merchantRisk || row.merchant_risk || 'low',
        riskScore: parseFloat(row.riskScore || row.risk_score || 0),
        timeAnomaly: row.timeAnomaly === true || row.timeAnomaly === 'true',
        hour: parseInt(row.hour || 12),
        cardLast4: row.cardLast4 || row.card || '0000'
      };
      return { ...parsed, alerts: evaluateCreditTransaction(parsed), row: i + 1 };
    });
    setDatasetResults(results);
    setMode('dataset');

    setHistory({
      labels: results.map((_, i) => `Txn ${i + 1}`),
      risk: results.map(r => r.riskScore),
      amount: results.map(r => r.amount)
    });
    addLog(`Dataset loaded: ${results.length} transactions processed`, 'manual');
  };

  const lineData = {
    labels: history.labels,
    datasets: [
      { label: 'Risk Score', data: history.risk, borderColor: '#b84040', backgroundColor: 'rgba(184,64,64,0.05)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true }
    ]
  };

  const barData = {
    labels: history.labels.slice(-15),
    datasets: [{
      label: 'Transaction Amount ($)',
      data: history.amount.slice(-15),
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: '#444',
      borderWidth: 1
    }]
  };

  const idle = !machineOn;

  return (
    <main className="cs-page">
      <h1 className="cs-page__title">Credit Card Monitoring</h1>
      <p className="cs-page__subtitle">Transaction fraud detection & situational awareness</p>

      {!automationOn && machineOn && (
        <div className="cs-auto-disabled-banner">
          ⚠ Automation Disabled — Manual approval required for all decisions
        </div>
      )}

      {/* Mode Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="cs-mode-toggle">
          <button className={`cs-mode-toggle__btn ${mode === 'live' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('live')}>Live Mode</button>
          <button className={`cs-mode-toggle__btn ${mode === 'dataset' ? 'cs-mode-toggle__btn--active' : ''}`} onClick={() => setMode('dataset')}>Dataset Mode</button>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Status: {idle ? 'Idle' : status.overallStatus.toUpperCase()}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="cs-grid cs-grid--6">
        <MetricCard title="Amount" value={`$${data.amount.toLocaleString()}`} status={data.amount > 5000 ? 'warning' : 'ok'} idle={idle} footer="Current transaction" />
        <MetricCard title="Location" value={data.locationMismatch ? 'MISMATCH' : 'Match'} status={data.locationMismatch ? 'danger' : 'ok'} idle={idle} footer="Geo verification" />
        <MetricCard title="Frequency" value={data.frequencyPerMin} unit="/min" status={data.frequencyPerMin >= 5 ? 'warning' : 'ok'} idle={idle} footer="Txn rate" />
        <MetricCard title="Merchant Risk" value={data.merchantRisk.toUpperCase()} status={data.merchantRisk === 'high' ? 'danger' : data.merchantRisk === 'medium' ? 'warning' : 'ok'} idle={idle} footer={data.merchantCategory} />
        <MetricCard title="Time Anomaly" value={data.timeAnomaly ? 'YES' : 'No'} status={data.timeAnomaly ? 'warning' : 'ok'} idle={idle} footer={`Hour: ${data.hour}:00`} />
        <MetricCard title="Risk Score" value={data.riskScore} unit="%" status={data.riskScore > 85 ? 'critical' : data.riskScore > 60 ? 'warning' : 'ok'} idle={idle} footer="Fraud likelihood" />
      </div>

      {/* Charts Row */}
      <div className="cs-section-title">Visualization</div>
      <div className="cs-grid cs-grid--2">
        <div className="cs-card cs-card--chart cs-relative">
          <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
            <span className="cs-idle-overlay__text">Paused</span>
          </div>
          <div className="cs-card__header">
            <span className="cs-card__title">Risk Score Over Time</span>
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
            <span className="cs-card__title">Transaction Amounts</span>
          </div>
          <div className="cs-chart-container">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Fraud Confidence & Situational Awareness */}
      <div className="cs-section-title">Situational Awareness</div>
      <div className="cs-grid cs-grid--3">
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Fraud Confidence Meter</span>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px' }}>
            {status.fraudConfidence}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cs-text-muted)', marginLeft: '4px' }}>%</span>
          </div>
          <ConfidenceMeter label="Overall Fraud Risk" value={status.fraudConfidence} />
          <ConfidenceMeter label="Location Risk" value={data.locationMismatch ? 80 : 10} />
          <ConfidenceMeter label="Behavioral Pattern" value={Math.min(100, data.frequencyPerMin * 15)} />
        </div>
        <div className="cs-card cs-card--panel">
          <div className="cs-card__header">
            <span className="cs-card__title">Transaction Timeline</span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {txnTimeline.slice(-10).reverse().map((t, i) => (
              <div key={i} className={`cs-log-entry ${t.riskScore > 85 ? 'cs-log-entry--alert' : t.riskScore > 60 ? 'cs-log-entry--manual' : 'cs-log-entry--auto'}`}>
                <div className="cs-log-entry__time">****{t.cardLast4} · ${t.amount.toLocaleString()}</div>
                <div className="cs-log-entry__msg">{t.merchantCategory} · Risk: {t.riskScore}%</div>
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
              { key: 'amount', label: 'Amount ($)', min: 0, max: 20000, step: 100, value: whatIf.amount, unit: '$' },
              { key: 'riskScore', label: 'Risk Score', min: 0, max: 100, step: 1, value: whatIf.riskScore, unit: '%' },
              { key: 'frequencyPerMin', label: 'Freq / Min', min: 0, max: 15, step: 1, value: whatIf.frequencyPerMin }
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
      <FileUpload onDataLoaded={handleDatasetUpload} domain="credit" />

      {/* Dataset Results */}
      {datasetResults && mode === 'dataset' && (
        <div style={{ marginTop: '16px' }}>
          <div className="cs-card cs-card--panel">
            <div className="cs-card__header">
              <span className="cs-card__title">Transaction Analysis Results</span>
              <span className="cs-card__badge cs-card__badge--info">{datasetResults.length} transactions</span>
            </div>
            <div className="cs-preview-container">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>#</th><th>Amount</th><th>Risk</th><th>Merchant</th><th>Location</th><th>Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.row}</td>
                      <td>${r.amount.toLocaleString()}</td>
                      <td>{r.riskScore}%</td>
                      <td>{r.merchantCategory}</td>
                      <td>{r.locationMismatch ? '⚠ Mismatch' : '✓ Match'}</td>
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
        title="Transaction Alert — Human Review Required"
        description="Automation is disabled. Review the flagged transaction before taking action."
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
