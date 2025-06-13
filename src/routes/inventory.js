import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all inventory
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.*,
                p.name as product_name,
                p.sku,
                p.price
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            ORDER BY i.updated_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET inventory by product ID
router.get('/product/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT * FROM inventory WHERE product_id = $1',
            [productId]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Inventory not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST adjust inventory
router.post('/adjust', async (req, res) => {
    try {
        const { product_id, adjustment, reason, location } = req.body;
        
        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get current inventory
            const currentInventory = await client.query(
                'SELECT * FROM inventory WHERE product_id = $1',
                [product_id]
            );
            
            if (currentInventory.rows.length === 0) {
                // Create new inventory record if it doesn't exist
                const result = await client.query(
                    'INSERT INTO inventory (product_id, quantity, location) VALUES ($1, $2, $3) RETURNING *',
                    [product_id, adjustment, location]
                );
                res.status(201).json(result.rows[0]);
            } else {
                // Update existing inventory
                const newQuantity = currentInventory.rows[0].quantity + adjustment;
                if (newQuantity < 0) {
                    throw new Error('Insufficient inventory');
                }
                
                const result = await client.query(
                    'UPDATE inventory SET quantity = $1, location = COALESCE($2, location) WHERE product_id = $3 RETURNING *',
                    [newQuantity, location, product_id]
                );
                res.json(result.rows[0]);
            }
            
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error adjusting inventory:', err);
        if (err.message === 'Insufficient inventory') {
            res.status(400).json({ error: 'Insufficient inventory' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                i.*,
                p.name as product_name,
                p.sku
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE i.quantity <= i.min_quantity
            ORDER BY i.quantity ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching low stock alerts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update inventory settings
router.put('/settings/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { min_quantity, max_quantity, location } = req.body;
        
        const result = await pool.query(
            'UPDATE inventory SET min_quantity = $1, max_quantity = $2, location = $3 WHERE product_id = $4 RETURNING *',
            [min_quantity, max_quantity, location, id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Inventory not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error updating inventory settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 