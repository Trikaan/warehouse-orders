const express = require('express');
const cors = require('cors');
const ordersRouter = require('./orders');

const app = express();
const PORT = 3131;

app.use(cors());
app.use(express.json());

// Routes
app.use('orders', ordersRouter);
app.get('orders', (req, res) => {
    res.send('Warehouse Order Management API is running');
});

app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
});
