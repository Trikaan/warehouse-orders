import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
    database: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'warehouse_db',
        password: process.env.DB_PASSWORD || '1111',
        port: parseInt(process.env.DB_PORT || '6969', 10),
    },
    server: {
        port: parseInt(process.env.PORT || '3132', 10),
        host: process.env.HOST || 'localhost',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    }
}; 