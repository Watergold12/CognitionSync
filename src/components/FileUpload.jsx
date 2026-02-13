import React, { useState } from 'react';
import Papa from 'papaparse';

export default function FileUpload({ onDataLoaded, domain }) {
    const [preview, setPreview] = useState(null);
    const [fileName, setFileName] = useState('');

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);

        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'json') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const arr = Array.isArray(data) ? data : [data];
                    setPreview(arr.slice(0, 10));
                    onDataLoaded(arr);
                } catch (err) {
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        } else if (ext === 'csv') {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                complete: (results) => {
                    setPreview(results.data.slice(0, 10));
                    onDataLoaded(results.data);
                },
                error: () => alert('Error parsing CSV')
            });
        } else {
            alert('Please upload a CSV or JSON file');
        }
    };

    return (
        <div className="cs-card cs-card--panel">
            <div className="cs-card__header">
                <span className="cs-card__title">Sample Data Upload</span>
                {fileName && <span className="cs-card__badge cs-card__badge--info">{fileName}</span>}
            </div>

            <label className="cs-upload" htmlFor={`file-upload-${domain}`}>
                <div className="cs-upload__icon">⬆</div>
                <div className="cs-upload__text">Drop CSV or JSON file here, or click to browse</div>
                <div className="cs-upload__hint">Accepted formats: .csv, .json</div>
                <input
                    id={`file-upload-${domain}`}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFile}
                    style={{ display: 'none' }}
                />
            </label>

            {preview && preview.length > 0 && (
                <>
                    <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--cs-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                        Preview (first {preview.length} rows)
                    </div>
                    <div className="cs-preview-container" style={{ marginTop: '8px' }}>
                        <table className="cs-table">
                            <thead>
                                <tr>
                                    {Object.keys(preview[0]).map(k => <th key={k}>{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((v, j) => <td key={j}>{String(v)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
