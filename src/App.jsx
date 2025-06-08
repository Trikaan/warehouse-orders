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
  CircularProgress
} from "@mui/material";

const API_BASE_URL = "http://localhost:3132";

function App() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newOrder, setNewOrder] = useState({ product: "", quantity: "" });
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/orders`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                // Ensure data is an array
                const ordersArray = Array.isArray(data) ? data : [];
                setOrders(ordersArray);
                setError(null);
            })
            .catch((err) => {
                console.error("Error fetching orders:", err);
                setOrders([]); // Set to empty array on error
                setError("Failed to load orders. Please make sure the backend server is running.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewOrder((prev) => ({ ...prev, [name]: value }));
    };

    const addOrder = () => {
        if (!newOrder.product || !newOrder.quantity) return;
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
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then((order) => {
                setOrders((prev) => [...prev, order]);
                setNewOrder({ product: "", quantity: "" });
                setError(null);
            })
            .catch((err) => {
                console.error("Error adding order:", err);
                setError("Failed to add order. Please try again.");
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
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="product"
                                label="Product name"
                                value={newOrder.product}
                                onChange={handleInputChange}
                                disabled={loading}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="quantity"
                                type="number"
                                label="Quantity"
                                value={newOrder.quantity}
                                onChange={handleInputChange}
                                disabled={loading}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button 
                                variant="contained" 
                                onClick={addOrder}
                                disabled={loading || !newOrder.product || !newOrder.quantity}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Add Order'}
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                            <CircularProgress />
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Product</TableCell>
                                    <TableCell>Quantity</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No orders found. Add your first order above.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell>{order.id}</TableCell>
                                            <TableCell>{order.product}</TableCell>
                                            <TableCell>{order.quantity}</TableCell>
                                            <TableCell>{order.status}</TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => updateStatus(order.id, "Shipped")}
                                                    sx={{ mr: 1 }}
                                                    disabled={loading || order.status === "Shipped"}
                                                >
                                                    Mark as Shipped
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => updateStatus(order.id, "Cancelled")}
                                                    disabled={loading || order.status === "Cancelled"}
                                                >
                                                    Cancel
                                                </Button>
                                            </TableCell>
                                        </TableRow>
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
