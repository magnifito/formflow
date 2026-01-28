import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Store for received webhooks
let webhooks = [];
const MAX_WEBHOOKS = 50;

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from Vite build
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Webhook receiver endpoint
app.post('/webhook', (req, res) => {
    const webhookEntry = {
        id: Date.now() + Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
    };

    webhooks.unshift(webhookEntry);
    if (webhooks.length > MAX_WEBHOOKS) {
        webhooks.pop();
    }

    console.log(`[Webhook Received] ${webhookEntry.timestamp} - ${JSON.stringify(req.body).substring(0, 100)}...`);

    res.status(200).json({ status: 'received', id: webhookEntry.id });
});

// API to list received webhooks
app.get('/api/webhooks', (req, res) => {
    res.json(webhooks);
});

// API to clear webhooks
app.delete('/api/webhooks', (req, res) => {
    webhooks = [];
    res.status(204).send();
});

// Fallback to index.html for SPA
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/webhook') {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`FormFlow Lab server running on http://localhost:${PORT}`);
    console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});

const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
