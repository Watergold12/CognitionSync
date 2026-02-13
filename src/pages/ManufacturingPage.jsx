import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getManufacturingStatus, generateManufacturingData, evaluateManufacturing } from '../engines/manufacturingEngine';

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

export default function ManufacturingPage({ machineOn, automationOn }) {
    const [data, setData] = useState(generateManufacturingData());
    const [history, setHistory] = useState({ labels: [], defect: [], load: [], temp: [], production: [] });
    const [logs, setLogs] = useState([]);
    const [modal, setModal] = useState({ visible: false, alerts: [] });
    const [mode, setMode] = useState('live'); // 'live' | 'dataset'
    const [datasetResults, setDatasetResults] = useState(null);

    // What-If
    const [whatIf, setWhatIf] = useState({
        defectPercent: 1, furnaceTemp: 850, dieWear: 50, machineLoad: 90
    });

    const addLog = useCallback((msg, type = 'auto') => {
        setLogs(prev => [{ time: ts(), msg, type }, ...prev].slice(0, 100));
    }, []);

    // Live data loop
    useEffect(() => {
        if (!machineOn || mode !== 'live') return;
        const interval = setInterval(() => {
            const newData = generateManufacturingData();
            setData(newData);

            setHistory(prev => {
                const label = ts();
                const trim = (arr) => [...arr, undefined].slice(-MAX_POINTS - 1, -1);
                return {
                    labels: [...trim(prev.labels), label],
                    defect: [...trim(prev.defect), newData.defectPercent],
                    load: [...trim(prev.load), newData.machineLoad],
                    temp: [...trim(prev.temp), newData.furnaceTemp],
                    production: [...trim(prev.production), newData.productionOutput]
                };
            });

            const status = getManufacturingStatus(newData);
            if (status.alerts.length > 0) {
                if (automationOn) {
                    status.alerts.forEach(a => addLog(`[AUTO] ${a.action}: ${a.rule} — ${a.reason}`, 'alert'));
                } else {
                    setModal({ visible: true, alerts: status.alerts });
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [machineOn, automationOn, mode, addLog]);

    const status = getManufacturingStatus(data);
    const whatIfAlerts = evaluateManufacturing(whatIf);

    const handleDatasetUpload = (rows) => {
        const results = rows.map((row, i) => {
            const parsed = {
                machineLoad: parseFloat(row.machineLoad || row.machine_load || 0),
                strokeRate: parseFloat(row.strokeRate || row.stroke_rate || 0),
                defectPercent: parseFloat(row.defectPercent || row.defect_percent || row.defect || 0),
                furnaceTemp: parseFloat(row.furnaceTemp || row.furnace_temp || row.temp || 0),
                dieWear: parseFloat(row.dieWear || row.die_wear || 0),
                platingThickness: parseFloat(row.platingThickness || row.plating || 0),
                hardness: parseFloat(row.hardness || 0),
                productionOutput: parseInt(row.productionOutput || row.production || 0)
            };
            return { ...parsed, alerts: evaluateManufacturing(parsed), row: i + 1 };
        });
        setDatasetResults(results);
        setMode('dataset');

        // Update chart with dataset
        setHistory({
            labels: results.map((_, i) => `Row ${i + 1}`),
            defect: results.map(r => r.defectPercent),
            load: results.map(r => r.machineLoad),
            temp: results.map(r => r.furnaceTemp),
            production: results.map(r => r.productionOutput)
        });
        addLog(`Dataset loaded: ${results.length} rows processed`, 'manual');
    };

    const lineData = {
        labels: history.labels,
        datasets: [
            { label: 'Defect %', data: history.defect, borderColor: '#b84040', backgroundColor: 'rgba(184,64,64,0.05)', borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: true },
            { label: 'Load (T)', data: history.load, borderColor: '#888', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
            { label: 'Temp (°C)', data: history.temp, borderColor: '#5a7fa8', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3 }
        ]
    };

    const barData = {
        labels: history.labels.slice(-10),
        datasets: [{
            label: 'Production Output',
            data: history.production.slice(-10),
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderColor: '#444',
            borderWidth: 1
        }]
    };

    const idle = !machineOn;

    return (
        <main className="cs-page">
            <h1 className="cs-page__title">Screw Manufacturing</h1>
            <p className="cs-page__subtitle">Real-time production monitoring & quality assurance</p>

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
                <MetricCard title="Machine Load" value={data.machineLoad.toFixed(0)} unit="T" status={data.machineLoad > 120 ? 'critical' : 'ok'} idle={idle} footer="Safe < 120T" />
                <MetricCard title="Stroke Rate" value={data.strokeRate.toFixed(0)} unit="spm" status="ok" idle={idle} footer="Strokes/min" />
                <MetricCard title="Defect %" value={data.defectPercent.toFixed(1)} unit="%" status={data.defectPercent >= 2 ? 'warning' : 'ok'} idle={idle} footer="Threshold: 2%" />
                <MetricCard title="Furnace Temp" value={data.furnaceTemp.toFixed(0)} unit="°C" status={Math.abs(data.furnaceTemp - 850) > 15 ? 'danger' : 'ok'} idle={idle} footer="Target: 850°C" />
                <MetricCard title="Die Wear" value={data.dieWear.toFixed(0)} unit="%" status={data.dieWear > 80 ? 'warning' : 'ok'} idle={idle} footer="Max: 80%" />
                <MetricCard title="Plating" value={data.platingThickness.toFixed(1)} unit="μm" status="ok" idle={idle} footer="Thickness" />
            </div>

            {/* Charts Row */}
            <div className="cs-section-title">Visualization</div>
            <div className="cs-grid cs-grid--2">
                <div className="cs-card cs-card--chart cs-relative">
                    <div className={`cs-idle-overlay ${idle ? 'cs-idle-overlay--visible' : ''}`}>
                        <span className="cs-idle-overlay__text">Paused</span>
                    </div>
                    <div className="cs-card__header">
                        <span className="cs-card__title">Defect %, Load & Temperature Trend</span>
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
                        <span className="cs-card__title">Production Output</span>
                    </div>
                    <div className="cs-chart-container">
                        <Bar data={barData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Compliance & Maintenance */}
            <div className="cs-section-title">Compliance & Maintenance</div>
            <div className="cs-grid cs-grid--3">
                <div className="cs-card cs-card--panel">
                    <div className="cs-card__header">
                        <span className="cs-card__title">Compliance Panel</span>
                        <span className={`cs-card__badge ${status.complianceScore >= 80 ? 'cs-card__badge--ok' : status.complianceScore >= 50 ? 'cs-card__badge--warning' : 'cs-card__badge--danger'}`}>
                            {status.complianceScore}%
                        </span>
                    </div>
                    <ConfidenceMeter label="ISO 898-1 Compliance" value={status.complianceScore} />
                    <ConfidenceMeter label="Defect Tolerance" value={Math.max(0, 100 - data.defectPercent * 25)} />
                    <ConfidenceMeter label="Thermal Compliance" value={Math.max(0, 100 - Math.abs(data.furnaceTemp - 850) * 3)} />
                </div>
                <div className="cs-card cs-card--panel">
                    <div className="cs-card__header">
                        <span className="cs-card__title">Maintenance Prediction</span>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
                        {status.maintenancePrediction.daysRemaining}<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cs-text-muted)', marginLeft: '4px' }}>days</span>
                    </div>
                    <ConfidenceMeter label="Prediction Confidence" value={status.maintenancePrediction.confidence} />
                    <div style={{ fontSize: '12px', color: 'var(--cs-text-muted)', marginTop: '8px' }}>
                        {status.maintenancePrediction.recommendation}
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
                            { key: 'defectPercent', label: 'Defect %', min: 0, max: 10, step: 0.1, value: whatIf.defectPercent, unit: '%' },
                            { key: 'furnaceTemp', label: 'Furnace Temp', min: 800, max: 900, step: 1, value: whatIf.furnaceTemp, unit: '°C' },
                            { key: 'dieWear', label: 'Die Wear', min: 0, max: 100, step: 1, value: whatIf.dieWear, unit: '%' },
                            { key: 'machineLoad', label: 'Machine Load', min: 50, max: 200, step: 1, value: whatIf.machineLoad, unit: 'T' }
                        ]}
                        onChange={(key, val) => setWhatIf(prev => ({ ...prev, [key]: val }))}
                    />
                    {whatIfAlerts.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <ExplainabilityPanel alerts={whatIfAlerts} />
                        </div>
                    )}
                </div>
                <DecisionLog logs={logs} onAddManual={(msg) => addLog(`[MANUAL] ${msg}`, 'manual')} />
            </div>

            {/* File Upload */}
            <div className="cs-section-title">Data Upload</div>
            <FileUpload onDataLoaded={handleDatasetUpload} domain="manufacturing" />

            {/* Dataset Results Table */}
            {datasetResults && mode === 'dataset' && (
                <div style={{ marginTop: '16px' }}>
                    <div className="cs-card cs-card--panel">
                        <div className="cs-card__header">
                            <span className="cs-card__title">Dataset Analysis Results</span>
                            <span className="cs-card__badge cs-card__badge--info">{datasetResults.length} rows</span>
                        </div>
                        <div className="cs-preview-container">
                            <table className="cs-table">
                                <thead>
                                    <tr>
                                        <th>Row</th><th>Load</th><th>Defect%</th><th>Temp</th><th>Die Wear</th><th>Alerts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasetResults.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.row}</td>
                                            <td>{r.machineLoad.toFixed(0)}T</td>
                                            <td>{r.defectPercent.toFixed(1)}%</td>
                                            <td>{r.furnaceTemp.toFixed(0)}°C</td>
                                            <td>{r.dieWear.toFixed(0)}%</td>
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
                title="Manufacturing Alert — Human Review Required"
                description="Automation is disabled. The following conditions require your manual approval before corrective action."
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
