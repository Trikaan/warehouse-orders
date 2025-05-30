const express = require('express');
const router = express.Router();

// In-memory data for demo


// GET all orders
router.get('./orders.json', (req, res) => {
    res.json(orders);
});

// POST new order
router.post('./orders.json', (req, res) => {
    const { product, quantity } = req.body;
    const newOrder = {
        id: orders.length + 1,
        product,
        quantity: parseInt(quantity),
        status: 'Pending'
    };
    orders.push(newOrder);
    res.status(201).json(newOrder);
});

// PUT update status
router.put('./orders.json/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const order = orders.find(o => o.id === id);

    if (order) {
        order.status = status;
        res.json(order);
    } else {
        res.status(404).json({ message: 'Order not found' });
    }
});

module.exports = router;
