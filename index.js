import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ordersRouter from './orders.js';
import { config } from './src/config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS configuration
app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/orders', ordersRouter);
app.get('/', (req, res) => {
    res.send('Warehouse Order Management API is running');
});

app.listen(config.server.port, config.server.host, () => {
    console.log(`API server listening on http://${config.server.host}:${config.server.port}`);
});
        