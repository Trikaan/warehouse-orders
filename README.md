# Warehouse Order Management System

A full-stack web application for managing warehouse orders, products, and inventory. Built with React, Express.js, and PostgreSQL.

## Features

- Order management
- Product catalog
- Inventory tracking
- RESTful API endpoints
- Modern UI with Material-UI and Tailwind CSS

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd warehouse
```

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database:
```sql
CREATE DATABASE warehouse_db;
```

4. Create a `.env` file in the root directory with the following variables:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=warehouse_db
DB_PASSWORD=your_password
DB_PORT=6969
PORT=3132
HOST=localhost
CORS_ORIGIN=http://localhost:5173
```

## Development

1. Start the development server:
```bash
npm run dev
```
This will start the Vite development server for the frontend.

2. In a separate terminal, start the backend server:
```bash
npm start
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3132

## API Endpoints

The following API endpoints are available:

- Orders: `/api/orders`
- Products: `/api/products`
- Inventory: `/api/inventory`

## Building for Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Project Structure

```
warehouse/
├── src/
│   ├── config/         # Configuration files
│   ├── routes/         # API routes
│   └── ...
├── index.js           # Main server file
├── package.json       # Project dependencies
└── vite.config.js     # Vite configuration
```

## Dependencies

### Frontend
- React
- Material-UI
- Tailwind CSS
- Radix UI
- Vite

### Backend
- Express.js
- PostgreSQL
- CORS
- dotenv

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. 