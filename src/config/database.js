import pkg from 'pg';
import { config } from './config.js';

const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'warehouse_db',
    password: '1111',
    port: 6969,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Add SCRAM-SHA-256 authentication
    client_encoding: 'utf8',
    application_name: 'warehouse_app'
});

// Add error handler for better debugging
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Add connection testing
pool.on('connect', (client) => {
    console.log('New client connected to database');
});

export default pool; 