import pkg from 'pg';
const { Pool } = pkg;

async function checkSchema() {
    const pool = new Pool({
        user: 'postgres',
        password: '1111',
        host: 'localhost',
        port: 6969,
        database: 'warehouse_db',
        connectionTimeoutMillis: 5000,
    });

    try {
        console.log('Connecting to warehouse_db...');
        const client = await pool.connect();
        
        // Check tables
        const tables = ['products', 'inventory', 'orders', 'order_history'];
        for (const table of tables) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [table]);
            console.log(`Table ${table} exists:`, result.rows[0].exists);
            
            if (result.rows[0].exists) {
                const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Number of rows in ${table}:`, countResult.rows[0].count);
            }
        }
        
        // Check functions
        const functions = ['update_updated_at_column', 'update_inventory_on_order'];
        for (const func of functions) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM pg_proc 
                    WHERE proname = $1
                )
            `, [func]);
            console.log(`Function ${func} exists:`, result.rows[0].exists);
        }
        
        // Check triggers
        const triggers = [
            'update_products_updated_at',
            'update_inventory_updated_at',
            'update_orders_updated_at',
            'update_inventory_on_order_change'
        ];
        for (const trigger of triggers) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM pg_trigger 
                    WHERE tgname = $1
                )
            `, [trigger]);
            console.log(`Trigger ${trigger} exists:`, result.rows[0].exists);
        }
        
        client.release();
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema().catch(console.error); 