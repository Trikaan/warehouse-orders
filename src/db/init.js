import pkg from 'pg';
const { Pool } = pkg;

// First connect to the default postgres database
const initPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '1111',
    port: 6969,
    ssl: false,
    client_encoding: 'utf8',
    application_name: 'warehouse_init'
});

async function setupDatabase() {
    let client;
    try {
        console.log('Attempting to connect to PostgreSQL...');
        client = await initPool.connect();
        console.log('Successfully connected to PostgreSQL!');

        // Check if database exists
        const dbExists = await client.query(
            "SELECT 1 FROM pg_database WHERE datname = 'warehouse_db'"
        );

        if (dbExists.rows.length === 0) {
            // Create database if it doesn't exist
            console.log('Creating warehouse_db database...');
            await client.query('CREATE DATABASE warehouse_db');
            console.log('Database created successfully!');
        } else {
            console.log('Database warehouse_db already exists');
        }

        // Close connection to postgres database
        await client.release();
        await initPool.end();

        // Connect to warehouse_db
        const warehousePool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'warehouse_db',
            password: '1111',
            port: 6969,
            ssl: false,
            client_encoding: 'utf8',
            application_name: 'warehouse_init'
        });

        client = await warehousePool.connect();
        console.log('Connected to warehouse_db');

        // Create tables and functions
        console.log('Creating tables and functions...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                product VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Create trigger
        console.log('Setting up triggers...');
        await client.query(`
            DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
            CREATE TRIGGER update_orders_updated_at
                BEFORE UPDATE ON orders
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('\nError setting up database:');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        if (error.detail) console.error('Detail:', error.detail);
        
        console.error('\nTroubleshooting steps:');
        console.error('1. Verify PostgreSQL is running (check services.msc)');
        console.error('2. Verify the password is correct (current: 1111)');
        console.error('3. Try connecting using pgAdmin 4');
        console.error('4. Check if the port 5432 is not blocked by firewall');
        
        process.exit(1);
    } finally {
        if (client) {
            await client.release();
        }
    }
}

setupDatabase().catch(console.error); 