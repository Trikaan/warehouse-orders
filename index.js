import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ordersRouter from './src/routes/orders.js';
import productsRouter from './src/routes/products.js';
import inventoryRouter from './src/routes/inventory.js';
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

// Welcome route
app.get('/', (req, res) => {
    res.send('Warehouse Order Management API is running');
});

// Mount routers
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

app.listen(config.server.port, config.server.host, () => {
    console.log(`API server listening on http://${config.server.host}:${config.server.port}`);
});
        