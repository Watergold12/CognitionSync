const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// File upload setup
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── API Routes ──────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let data;

    if (ext === '.json') {
      data = JSON.parse(content);
      if (!Array.isArray(data)) data = [data];
    } else {
      // Basic CSV parsing
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      data = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
          const num = parseFloat(vals[i]);
          obj[h] = isNaN(num) ? vals[i] : num;
        });
        return obj;
      });
    }

    // Cleanup uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      filename: req.file.originalname,
      rowCount: data.length,
      data
    });
  } catch (err) {
    fs.unlinkSync(filePath);
    res.status(400).json({ error: 'Failed to parse file', details: err.message });
  }
});

// Decision log export
app.post('/api/audit/export', (req, res) => {
  const { logs, domain } = req.body;
  const content = logs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${domain}_audit_${Date.now()}.txt"`);
  res.send(content);
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CognitionSync API server running on http://localhost:${PORT}`);
});
