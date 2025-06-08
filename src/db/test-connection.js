import pkg from 'pg';
import { config } from '../config/config.js';

const { Pool } = pkg;

async function testConnection() {
    const pool = new Pool({
        user: 'postgres',
        password: '1111',
        host: 'localhost',
        port: 6969,
        database: 'postgres', // Try to connect to the default database first
        connectionTimeoutMillis: 5000, // 5 seconds
    });

    try {
        console.log('Attempting to connect to PostgreSQL...');
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL!');
        
        // Test query
        const result = await client.query('SELECT version()');
        console.log('PostgreSQL version:', result.rows[0].version);
        
        // List all databases
        const dbResult = await client.query('SELECT datname FROM pg_database');
        console.log('\nAvailable databases:');
        dbResult.rows.forEach(row => console.log('-', row.datname));
        
        client.release();
    } catch (err) {
        console.error('\nError details:');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        
        console.error('\nConnection settings used:');
        console.error('Host:', 'localhost');
        console.error('Port:', 6969);
        console.error('Database:', 'postgres');
        console.error('User:', 'postgres');
        
        console.error('\nTroubleshooting steps:');
        console.error('1. Verify PostgreSQL is running');
        console.error('2. Check if the password is correct');
        console.error('3. Ensure PostgreSQL is accepting connections on localhost');
        console.error('4. Check if the firewall is allowing connections to port 6969');
    } finally {
        await pool.end();
    }
}

testConnection().catch(console.error); 