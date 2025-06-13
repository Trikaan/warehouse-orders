import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT p.*, i.quantity as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id ORDER BY p.created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET product by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT p.*, i.quantity as stock FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Product not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST new product
router.post('/', async (req, res) => {
    try {
        const { name, description, sku, price, initialStock, location } = req.body;
        
        // Start a transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Insert product
            const productResult = await client.query(
                'INSERT INTO products (name, description, sku, price) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, description, sku, price]
            );
            
            // Insert initial inventory if provided
            if (typeof initialStock !== 'undefined') {
                await client.query(
                    'INSERT INTO inventory (product_id, quantity, location) VALUES ($1, $2, $3)',
                    [productResult.rows[0].id, initialStock, location]
                );
            }
            
            await client.query('COMMIT');
            res.status(201).json(productResult.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update product
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description, sku, price } = req.body;
        
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, sku = $3, price = $4 WHERE id = $5 RETURNING *',
            [name, description, sku, price, id]
        );
        
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Product not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Check if product has any orders
        const orderCheck = await pool.query(
            'SELECT 1 FROM orders WHERE product_id = $1 LIMIT 1',
            [id]
        );
        
        if (orderCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete product with existing orders' 
            });
        }
        
        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Delete inventory first
            await client.query(
                'DELETE FROM inventory WHERE product_id = $1',
                [id]
            );
            
            // Delete product
            const result = await client.query(
                'DELETE FROM products WHERE id = $1 RETURNING *',
                [id]
            );
            
            await client.query('COMMIT');
            
            if (result.rows.length === 0) {
                res.status(404).json({ message: 'Product not found' });
            } else {
                res.json({ message: 'Product deleted successfully' });
            }
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 