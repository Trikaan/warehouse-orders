import React, { useState, useEffect } from "react";
import { 
    Card, 
    CardContent, 
    Button, 
    TextField,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Container,
    Typography,
    Grid,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Box,
    Collapse,
    Paper,
    Divider
} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from '@mui/icons-material';

const API_BASE_URL = "http://localhost:3132";

// Order row component with expandable details
function OrderRow({ order, onUpdateStatus, loading }) {
    const [open, setOpen] = useState(false);
    
    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>{order.customer_email}</TableCell>
                <TableCell>{order.shipping_address}</TableCell>
                <TableCell>${order.total_price}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onUpdateStatus(order.id, "Shipped")}
                        sx={{ mr: 1 }}
                        disabled={loading || order.status === "Shipped"}
                    >
                        Mark as Shipped
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => onUpdateStatus(order.id, "Cancelled")}
                        disabled={loading || order.status === "Cancelled"}
                    >
                        Cancel
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Order Items
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product</TableCell>
                                        <TableCell>SKU</TableCell>
                                        <TableCell align="right">Quantity</TableCell>
                                        <TableCell align="right">Unit Price</TableCell>
                                        <TableCell align="right">Subtotal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {order.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell component="th" scope="row">
                                                {item.product_name}
                                            </TableCell>
                                            <TableCell>{item.sku}</TableCell>
                                            <TableCell align="right">{item.quantity}</TableCell>
                                            <TableCell align="right">${item.unit_price}</TableCell>
                                            <TableCell align="right">${item.subtotal}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={4} align="right">
                                            <strong>Total:</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>${order.total_price}</strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

// Product item component for the order form
function ProductItem({ 
    index, 
    item, 
    products, 
    onUpdate, 
    onRemove, 
    loading, 
    fieldErrors 
}) {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <FormControl 
                        fullWidth 
                        disabled={loading} 
                        error={!!fieldErrors?.[`items.${index}.product_id`]}
                    >
                        <InputLabel>Product</InputLabel>
                        <Select
                            value={item.product_id}
                            label="Product"
                            onChange={(e) => onUpdate(index, { ...item, product_id: e.target.value })}
                        >
                            {products.map((product) => (
                                <MenuItem 
                                    key={product.id} 
                                    value={product.id}
                                    disabled={product.stock < 1}
                                >
                                    {product.name} - ${product.price} 
                                    {product.stock < 1 ? ' (Out of Stock)' : ` (${product.stock} available)`}
                                </MenuItem>
                            ))}
                        </Select>
                        {fieldErrors?.[`items.${index}.product_id`] && (
                            <Typography color="error" variant="caption">
                                {fieldErrors[`items.${index}.product_id`]}
                            </Typography>
                        )}
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <TextField
                        fullWidth
                        type="number"
                        label="Quantity"
                        value={item.quantity}
                        onChange={(e) => onUpdate(index, { ...item, quantity: parseInt(e.target.value) || '' })}
                        disabled={loading}
                        error={!!fieldErrors?.[`items.${index}.quantity`]}
                        helperText={fieldErrors?.[`items.${index}.quantity`]}
                        InputProps={{ inputProps: { min: 1 } }}
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Typography variant="body1">
                        Subtotal: ${((products.find(p => p.id === item.product_id)?.price || 0) * (item.quantity || 0)).toFixed(2)}
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={2}>
                    <IconButton 
                        onClick={() => onRemove(index)}
                        disabled={loading}
                        color="error"
                    >
                        <RemoveIcon />
                    </IconButton>
                </Grid>
            </Grid>
        </Paper>
    );
}

function App() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newOrder, setNewOrder] = useState({
        items: [{ product_id: "", quantity: "" }],
        customer_name: "",
        customer_email: "",
        shipping_address: ""
    });
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    const validateEmail = (email) => {
        return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    };

    const validateFields = () => {
        const errors = {};
        
        if (!newOrder.items.length) {
            errors['items'] = "At least one product is required";
        }

        newOrder.items.forEach((item, index) => {
            if (!item.product_id) {
                errors[`items.${index}.product_id`] = "Please select a product";
            }
            if (!item.quantity || item.quantity <= 0) {
                errors[`items.${index}.quantity`] = "Please enter a valid quantity";
            }
            const product = products.find(p => p.id === item.product_id);
            if (product && item.quantity > product.stock) {
                errors[`items.${index}.quantity`] = `Only ${product.stock} available`;
            }
        });
        
        if (!newOrder.customer_name.trim()) {
            errors.customer_name = "Please enter customer name";
        }
        
        if (!newOrder.customer_email) {
            errors.customer_email = "Please enter customer email";
        } else if (!validateEmail(newOrder.customer_email)) {
            errors.customer_email = "Please enter a valid email address";
        }
        
        if (!newOrder.shipping_address.trim()) {
            errors.shipping_address = "Please enter shipping address";
        }
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE_URL}/api/orders`).then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            }),
            fetch(`${API_BASE_URL}/api/products`).then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
        ])
        .then(([ordersData, productsData]) => {
            setOrders(Array.isArray(ordersData) ? ordersData : []);
            setProducts(Array.isArray(productsData) ? productsData : []);
            setError(null);
        })
        .catch((err) => {
            console.error("Error fetching data:", err);
            setOrders([]);
            setProducts([]);
            setError("Failed to load data. Please make sure the backend server is running.");
        })
        .finally(() => {
            setLoading(false);
        });
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewOrder((prev) => ({ ...prev, [name]: value }));
        setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleProductUpdate = (index, updatedItem) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === index ? updatedItem : item)
        }));
        setFieldErrors(prev => ({
            ...prev,
            [`items.${index}.product_id`]: undefined,
            [`items.${index}.quantity`]: undefined
        }));
    };

    const handleAddProduct = () => {
        setNewOrder(prev => ({
            ...prev,
            items: [...prev.items, { product_id: "", quantity: "" }]
        }));
    };

    const handleRemoveProduct = (index) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const addOrder = () => {
        if (!validateFields()) return;
        
        setLoading(true);
        fetch(`${API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newOrder),
        })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || 'Failed to add order');
                    });
                }
                return res.json();
            })
            .then((order) => {
                setOrders((prev) => [order, ...prev]);
                setNewOrder({
                    items: [{ product_id: "", quantity: "" }],
                    customer_name: "",
                    customer_email: "",
                    shipping_address: ""
                });
                setError(null);
                setFieldErrors({});
            })
            .catch((err) => {
                console.error("Error adding order:", err);
                setError(err.message || "Failed to add order. Please try again.");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const updateStatus = (id, status) => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/orders/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ status }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((updatedOrder) => {
                setOrders((prev) =>
                    prev.map((order) =>
                        order.id === updatedOrder.id ? updatedOrder : order
                    )
                );
                setError(null);
            })
            .catch((err) => {
                console.error("Error updating order:", err);
                setError("Failed to update order status. Please try again.");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Warehouse Order Management
            </Typography>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        New Order
                    </Typography>
                    
                    {/* Product Items */}
                    {newOrder.items.map((item, index) => (
                        <ProductItem
                            key={index}
                            index={index}
                            item={item}
                            products={products}
                            onUpdate={handleProductUpdate}
                            onRemove={handleRemoveProduct}
                            loading={loading}
                            fieldErrors={fieldErrors}
                        />
                    ))}
                    
                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddProduct}
                        disabled={loading}
                        sx={{ mb: 2 }}
                    >
                        Add Another Product
                    </Button>

                    <Divider sx={{ my: 2 }} />

                    {/* Customer Information */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="customer_name"
                                label="Customer Name"
                                value={newOrder.customer_name}
                                onChange={handleInputChange}
                                disabled={loading}
                                error={!!fieldErrors.customer_name}
                                helperText={fieldErrors.customer_name}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="customer_email"
                                label="Customer Email"
                                value={newOrder.customer_email}
                                onChange={handleInputChange}
                                disabled={loading}
                                type="email"
                                error={!!fieldErrors.customer_email}
                                helperText={fieldErrors.customer_email}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                name="shipping_address"
                                label="Shipping Address"
                                value={newOrder.shipping_address}
                                onChange={handleInputChange}
                                disabled={loading}
                                multiline
                                rows={2}
                                error={!!fieldErrors.shipping_address}
                                helperText={fieldErrors.shipping_address}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button 
                                variant="contained" 
                                onClick={addOrder}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Add Order'}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Order History
                    </Typography>
                    
                    {loading && orders.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell />
                                    <TableCell>ID</TableCell>
                                    <TableCell>Customer Name</TableCell>
                                    <TableCell>Customer Email</TableCell>
                                    <TableCell>Shipping Address</TableCell>
                                    <TableCell>Total Price</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            No orders found. Add your first order above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onUpdateStatus={updateStatus}
                                            loading={loading}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}

export default App;
