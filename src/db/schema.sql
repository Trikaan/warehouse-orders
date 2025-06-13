-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS update_inventory_on_order CASCADE;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    sku VARCHAR(50) UNIQUE NOT NULL CHECK (length(trim(sku)) > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    location VARCHAR(100),
    min_quantity INTEGER DEFAULT 0 CHECK (min_quantity >= 0),
    max_quantity INTEGER CHECK (max_quantity > min_quantity),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_quantity_range CHECK (quantity <= max_quantity)
);

-- Create orders table with enhanced fields (removed product-specific fields)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    customer_name VARCHAR(255) NOT NULL CHECK (length(trim(customer_name)) > 0),
    customer_email VARCHAR(255) CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    shipping_address TEXT NOT NULL CHECK (length(trim(shipping_address)) > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table for multiple products per order
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_history table for tracking status changes
CREATE TABLE order_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL 
        CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_history_order_id ON order_history(order_id);
CREATE INDEX idx_order_history_created_at ON order_history(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update inventory on order with validation
CREATE OR REPLACE FUNCTION update_inventory_on_order_item()
RETURNS TRIGGER AS $$
BEGIN
    -- For new order items
    IF TG_OP = 'INSERT' THEN
        -- Check if enough inventory exists
        IF NOT EXISTS (
            SELECT 1 FROM inventory 
            WHERE product_id = NEW.product_id 
            AND quantity >= NEW.quantity
        ) THEN
            RAISE EXCEPTION 'Insufficient inventory for product_id %', NEW.product_id;
        END IF;
        
        -- Update inventory
        UPDATE inventory
        SET quantity = quantity - NEW.quantity
        WHERE product_id = NEW.product_id;
        
    -- For order item updates
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.quantity != NEW.quantity THEN
            -- Check if enough inventory exists for increase
            IF NEW.quantity > OLD.quantity AND NOT EXISTS (
                SELECT 1 FROM inventory 
                WHERE product_id = NEW.product_id 
                AND quantity >= (NEW.quantity - OLD.quantity)
            ) THEN
                RAISE EXCEPTION 'Insufficient inventory for product_id %', NEW.product_id;
            END IF;
            
            -- Update inventory
            UPDATE inventory
            SET quantity = quantity + OLD.quantity - NEW.quantity
            WHERE product_id = NEW.product_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for inventory update
CREATE TRIGGER update_inventory_on_order_item_change
    AFTER INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order_item();

-- Insert sample data
INSERT INTO products (name, description, sku, price) VALUES
    ('Gaming Laptop', 'High-performance gaming laptop with RTX 4080', 'LAP-GAM-001', 1999.99),
    ('Business Laptop', 'Professional laptop for office work', 'LAP-BUS-001', 1299.99),
    ('Wireless Mouse', 'Ergonomic wireless mouse', 'ACC-MOU-001', 49.99),
    ('Mechanical Keyboard', 'RGB mechanical keyboard', 'ACC-KEY-001', 129.99),
    ('27" Monitor', '4K HDR monitor', 'MON-4K-001', 499.99);

-- Insert inventory data
INSERT INTO inventory (product_id, quantity, location, min_quantity, max_quantity) VALUES
    (1, 25, 'Warehouse A - Electronics', 5, 50),
    (2, 30, 'Warehouse A - Electronics', 10, 60),
    (3, 100, 'Warehouse B - Accessories', 20, 200),
    (4, 50, 'Warehouse B - Accessories', 15, 100),
    (5, 20, 'Warehouse A - Electronics', 5, 40);

-- Create a test order with multiple items
INSERT INTO orders (
    status, customer_name, customer_email, shipping_address, total_price
) VALUES (
    'Pending', 'John Doe', 'john.doe@example.com', 
    '123 Main St, City, Country', 2179.97
) RETURNING id;

-- Insert test order items
DO $$
DECLARE
    test_order_id INTEGER;
BEGIN
    SELECT id INTO test_order_id FROM orders ORDER BY id DESC LIMIT 1;
    
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
        (test_order_id, 1, 1, 1999.99, 1999.99),  -- Gaming Laptop
        (test_order_id, 3, 2, 49.99, 99.98),      -- Two Wireless Mice
        (test_order_id, 4, 1, 129.99, 129.99);    -- Mechanical Keyboard
END $$; 