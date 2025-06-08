import express from 'express';
import pool from './src/config/database.js';

const router = express.Router();

// GET all orders
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST new order
router.post('/', async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const result = await pool.query(
            'INSERT INTO orders (product, quantity) VALUES ($1, $2) RETURNING *',
            [product, quantity]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update status
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Order not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET order by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Order not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
