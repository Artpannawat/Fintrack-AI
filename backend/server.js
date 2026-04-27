require('ts-node/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate Limiter: 5 requests per 10 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit reached. Please wait 10 minutes.', retryAfter: 10 }
});

app.use(express.json()); // Move to top
app.use(cors());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Path: ${req.path}`);
    if (req.method === 'POST') console.log('POST Request body:', req.body);
    next();
});

// Root check
app.get('/', (req, res) => {
    res.json({ message: '🚀 FinTrack-AI Backend is running!' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'API is ONLINE', path: req.path });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'API is ONLINE (legacy)', path: req.path });
});

app.get('/test', (req, res) => {
    res.send('API is Ready!');
});

app.get('/api/test', (req, res) => {
    res.send('API is Ready! (legacy)');
});

// นำเข้าบริการ AI
const { aiService } = require('./src/services/ai-service');

app.post('/analyze-transaction', async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        if (!description || typeof amount !== 'number' || !category) {
            return res.status(400).json({ error: 'Missing required fields: description, amount, category' });
        }
        const aiResult = await aiService.analyzeTransaction(description, amount, category);
        res.json(aiResult);
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze transaction' });
    }
});

app.post('/api/analyze-transaction', async (req, res) => {
    // Legacy redirect or handle
    try {
        const aiResult = await aiService.analyzeTransaction(req.body.description, req.body.amount, req.body.category);
        res.json(aiResult);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// Behavior Analysis - explicit POST route
app.post('/analyze-behavior', async (req, res) => {
    console.log('--- AI Behavior Route Hit! ---');
    const { transactions, range } = req.body;
    try {
        if (!transactions || !range) return res.status(400).json({ error: 'Missing transactions or range' });
        const result = await aiService.analyzeBehavior(transactions, range);
        res.json(result);
    } catch (error) {
        console.error('Behavior Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze behavior' });
    }
});

app.post('/api/analyze-behavior', async (req, res) => {
    console.log('--- AI Behavior Route Hit! (Legacy) ---');
    const { transactions, range } = req.body;
    try {
        if (!transactions || !range) return res.status(400).json({ error: 'Missing transactions or range' });
        const result = await aiService.analyzeBehavior(transactions, range);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Catch-all route to debug 404s
app.use((req, res) => {
    console.warn(`[404] No route matched for ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Route not found', 
        requestedPath: req.path,
        requestedMethod: req.method 
    });
});

// เริ่มรันเซิร์ฟเวอร์ (เฉพาะเมื่อรันโดยตรง ไม่ใช่ผ่าน Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Server is running successfully on port ${PORT}`);
    });
}

module.exports = app;