import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all orders with their items
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            WITH order_details AS (
                SELECT 
                    o.id,
                    o.status,
                    o.customer_name,
                    o.customer_email,
                    o.shipping_address,
                    o.total_price,
                    o.created_at,
                    o.updated_at,
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_id', oi.product_id,
                            'product_name', p.name,
                            'sku', p.sku,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'subtotal', oi.subtotal
                        ) ORDER BY oi.created_at
                    ) as items
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                GROUP BY o.id
                ORDER BY o.created_at DESC
            )
            SELECT * FROM order_details
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST new order with multiple items
router.post('/', async (req, res) => {
    try {
        const { 
            items,  // Array of { product_id, quantity }
            customer_name, 
            customer_email, 
            shipping_address 
        } = req.body;

        // Validate required fields
        if (!items?.length || !customer_name || !customer_email || !shipping_address) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['items', 'customer_name', 'customer_email', 'shipping_address']
            });
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get product prices and validate inventory
            const productIds = items.map(item => item.product_id);
            const productsResult = await client.query(
                'SELECT id, price, (SELECT quantity FROM inventory WHERE product_id = products.id) as stock FROM products WHERE id = ANY($1)',
                [productIds]
            );

            const productPrices = {};
            const productStock = {};
            productsResult.rows.forEach(product => {
                productPrices[product.id] = product.price;
                productStock[product.id] = product.stock;
            });

            // Validate products exist and have sufficient stock
            for (const item of items) {
                if (!productPrices[item.product_id]) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }
                if (productStock[item.product_id] < item.quantity) {
                    throw new Error(`Insufficient stock for product: ${item.product_id}`);
                }
            }

            // Calculate total price
            const total_price = items.reduce((sum, item) => {
                return sum + (productPrices[item.product_id] * item.quantity);
            }, 0);

            // Create order
            const orderResult = await client.query(
                `INSERT INTO orders 
                    (customer_name, customer_email, shipping_address, total_price) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *`,
                [customer_name, customer_email, shipping_address, total_price]
            );

            const order_id = orderResult.rows[0].id;

            // Create order items
            for (const item of items) {
                const unit_price = productPrices[item.product_id];
                const subtotal = unit_price * item.quantity;
                
                await client.query(
                    `INSERT INTO order_items 
                        (order_id, product_id, quantity, unit_price, subtotal)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [order_id, item.product_id, item.quantity, unit_price, subtotal]
                );
            }

            // Fetch complete order with items
            const completeOrder = await client.query(`
                SELECT 
                    o.*,
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_id', oi.product_id,
                            'product_name', p.name,
                            'sku', p.sku,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'subtotal', oi.subtotal
                        )
                    ) as items
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.id = $1
                GROUP BY o.id`,
                [order_id]
            );

            await client.query('COMMIT');
            res.status(201).json(completeOrder.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error creating order:', err);
        if (err.message.startsWith('Product not found') || err.message.startsWith('Insufficient stock')) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// PUT update order status
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, notes } = req.body;
        
        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update order status
            const result = await client.query(
                'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Order not found');
            }

            // Add status change to history
            await client.query(
                'INSERT INTO order_history (order_id, status, notes) VALUES ($1, $2, $3)',
                [id, status, notes]
            );

            // Fetch complete order with items
            const completeOrder = await client.query(`
                SELECT 
                    o.*,
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_id', oi.product_id,
                            'product_name', p.name,
                            'sku', p.sku,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'subtotal', oi.subtotal
                        )
                    ) as items
                FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE o.id = $1
                GROUP BY o.id`,
                [id]
            );

            await client.query('COMMIT');
            res.json(completeOrder.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error updating order:', err);
        if (err.message === 'Order not found') {
            res.status(404).json({ message: 'Order not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// GET order history
router.get('/:id/history', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(
            'SELECT * FROM order_history WHERE order_id = $1 ORDER BY created_at ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching order history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router; 