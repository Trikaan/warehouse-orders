import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function WarehouseOrderManagement() {
    const [orders, setOrders] = useState([]);
    const [newOrder, setNewOrder] = useState({ product: "", quantity: "" });

    useEffect(() => {
        fetch("/api/orders")
            .then((res) => res.json())
            .then((data) => setOrders(data));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewOrder((prev) => ({ ...prev, [name]: value }));
    };

    const addOrder = () => {
        if (!newOrder.product || !newOrder.quantity) return;
        fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newOrder),
        })
            .then((res) => res.json())
            .then((order) => {
                setOrders((prev) => [...prev, order]);
                setNewOrder({ product: "", quantity: "" });
            });
    };

    const updateStatus = (id, status) => {
        fetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ status }),
        })
            .then((res) => res.json())
            .then((updatedOrder) => {
                setOrders((prev) =>
                    prev.map((order) =>
                        order.id === updatedOrder.id ? updatedOrder : order
                    )
                );
            });
    };

    return (
        <div className="p-4 grid gap-6">
            <h1 className="text-2xl font-bold">Warehouse Order Management</h1>

            <Card>
                <CardContent className="grid gap-4 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                            name="product"
                            placeholder="Product name"
                            value={newOrder.product}
                            onChange={handleInputChange}
                        />
                        <Input
                            name="quantity"
                            type="number"
                            placeholder="Quantity"
                            value={newOrder.quantity}
                            onChange={handleInputChange}
                        />
                    </div>
                    <Button onClick={addOrder}>Add Order</Button>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>{order.product}</TableCell>
                                    <TableCell>{order.quantity}</TableCell>
                                    <TableCell>{order.status}</TableCell>
                                    <TableCell className="space-x-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => updateStatus(order.id, "Shipped")}
                                        >
                                            Mark as Shipped
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => updateStatus(order.id, "Cancelled")}
                                        >
                                            Cancel
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
