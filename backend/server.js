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

// CORS: Allow localhost (dev) + your Vercel domain (prod)
const allowedOrigins = [
  'http://localhost:4200',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // ใน Production req.headers.origin อาจจะเป็น undefined ได้ในบางเคส แต่เบราว์เซอร์ส่วนใหญ่จะส่งมา
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));// Middleware logging for debugging production connection
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Path: ${req.path} | Origin: ${req.headers.origin || 'N/A'}`);
    next();
});

app.use(express.json());
// API ทดสอบว่าเซิร์ฟเวอร์ทำงานไหม
app.get('/', (req, res) => {
    res.json({ message: '🚀 FinTrack-AI Backend is running!' });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'API is ONLINE', 
        path: req.path,
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/test', (req, res) => {
    res.send('API is Ready!');
});

// นำเข้าบริการ AI
const { aiService } = require('./src/services/ai-service');

app.post('/api/analyze-transaction', async (req, res) => {
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

// Behavior Analysis - explicit POST route
app.post('/api/analyze-behavior', async (req, res) => {
    console.log('--- AI Behavior Route Hit! ---');
    const ip = req.ip || req.socket.remoteAddress;
    const timestamp = new Date().toLocaleTimeString('th-TH');
    const { transactions, range } = req.body;

    console.log(`\n[${timestamp}] 🤖 Behavior Analysis Request`);
    console.log(`   IP: ${ip} | Range: ${range} | Transactions: ${transactions?.length ?? 0}`);

    try {
        if (!transactions || !range) {
            return res.status(400).json({ error: 'Missing transactions or range' });
        }
        const result = await aiService.analyzeBehavior(transactions, range);
        const source = result.fallback ? '💡 Static Wisdom' : '🤖 Gemini AI';
        console.log(`   Result: ${source} | Score: ${result.score}`);
        res.json(result);
    } catch (error) {
        console.error('Behavior Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze behavior' });
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