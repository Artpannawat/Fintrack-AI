require('ts-node/register');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { aiService } = require('./src/services/ai-service');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARE (TOP PRIORITY)
app.use(cors());
app.use(express.json());

// Debugging log for production
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 2. EXACT ROUTES (EXPLICIT)

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: "API is ONLINE" });
});

app.get('/api/health', (req, res) => {
    res.json({ status: "API is ONLINE" });
});

// AI Behavior Analysis (Supporting both /api and non-api paths)
app.post('/api/analyze-behavior', async (req, res) => {
    console.log('--- AI Behavior Route Hit (/api) ---');
    const { transactions, range } = req.body;
    try {
        if (!transactions || !range) {
            return res.status(400).json({ error: 'Missing transactions or range' });
        }
        const result = await aiService.analyzeBehavior(transactions, range);
        res.json(result);
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'AI Analysis Failed' });
    }
});

app.post('/analyze-behavior', async (req, res) => {
    console.log('--- AI Behavior Route Hit (Direct) ---');
    const { transactions, range } = req.body;
    try {
        if (!transactions || !range) {
            return res.status(400).json({ error: 'Missing transactions or range' });
        }
        const result = await aiService.analyzeBehavior(transactions, range);
        res.json(result);
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'AI Analysis Failed' });
    }
});

// AI Transaction Analysis (Supporting both /api and non-api paths)
app.post('/api/analyze-transaction', async (req, res) => {
    const { description, amount, category } = req.body;
    try {
        const aiResult = await aiService.analyzeTransaction(description, amount, category);
        res.json(aiResult);
    } catch (error) {
        res.status(500).json({ error: 'Analysis Failed' });
    }
});

app.post('/analyze-transaction', async (req, res) => {
    const { description, amount, category } = req.body;
    try {
        const aiResult = await aiService.analyzeTransaction(description, amount, category);
        res.json(aiResult);
    } catch (error) {
        res.status(500).json({ error: 'Analysis Failed' });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.json({ message: '🚀 FinTrack-AI Backend is running!' });
});

// 3. CATCH-ALL (MUST BE AT THE BOTTOM)
app.use((req, res) => {
    console.warn(`[404] Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Route not found', path: req.path });
});

// START SERVER
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Server is running successfully on port ${PORT}`);
    });
}

module.exports = app;