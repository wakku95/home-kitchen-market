import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Badge, Spinner, Alert } from '../../components/common/Feedback';
import { ShoppingBag, ChevronRight, Clock, Utensils, Bike, Truck } from 'lucide-react';

export const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                setLoading(true);
                const res = await api.get('/customer/orders');
                if (res.data?.success) {
                    setOrders(res.data.data.data || res.data.data);
                }
            } catch (err) {
                setError('Failed to load your orders.');
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, []);

    const getStatusBadge = (status) => {
        const map = {
            PENDING: { label: 'Pending Kitchen Approval', variant: 'warning' },
            CHEF_ACCEPTED: { label: 'Kitchen Accepted', variant: 'info' },
            FINDING_RIDER: { label: 'Matching Rider', variant: 'info' },
            RIDER_ASSIGNED: { label: 'Rider Assigned', variant: 'primary' },
            AWAITING_CUSTOMER_PAYMENT: { label: 'Awaiting Your Payment', variant: 'warning' },
            PAYMENT_SUBMITTED: { label: 'Payment Under Review', variant: 'info' },
            PAYMENT_CONFIRMED: { label: 'Payment Confirmed', variant: 'success' },
            PREPARING: { label: 'Cooking in Progress', variant: 'primary' },
            READY_FOR_PICKUP: { label: 'Food Ready', variant: 'success' },
            PICKED_UP: { label: 'Rider Picked Up', variant: 'primary' },
            OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'primary' },
            DELIVERED: { label: 'Delivered', variant: 'success' },
            CHEF_REJECTED: { label: 'Rejected by Kitchen', variant: 'danger' },
            CUSTOMER_CANCELLED: { label: 'Cancelled', variant: 'neutral' },
            NO_RIDER_FOUND: { label: 'No Rider Found', variant: 'danger' },
            CHEF_CANCELLED: { label: 'Cancelled by Kitchen', variant: 'danger' },
        };

        const config = map[status] || { label: status.replace(/_/g, ' '), variant: 'neutral' };
        return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Your Food Orders</h1>
                    <p className="text-xs text-slate-500">Track current meals and view your past order receipts</p>
                </div>
                <Link
                    to="/"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition"
                >
                    Order More
                </Link>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">No Orders Yet</h3>
                    <p className="text-xs text-slate-500">
                        You haven't placed any food orders yet. Discover delicious home cooking nearby!
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl mt-2"
                    >
                        Browse Kitchens
                    </Link>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {orders.map((o) => (
                        <Link
                            key={o.id}
                            to={`/orders/${o.order_number}`}
                            className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-amber-400 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-600">
                                        {o.order_number}
                                    </span>
                                    {getStatusBadge(o.status)}
                                </div>

                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                                        {o.kitchen?.name}
                                    </h3>
                                    <span className="text-xs text-slate-400">&bull;</span>
                                    <span className="text-xs text-slate-500">
                                        {o.items_count} {o.items_count === 1 ? 'dish' : 'dishes'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span>{new Date(o.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1">
                                        {o.delivery_mode === 'own_rider' ? (
                                            <>
                                                <Truck className="w-3 h-3 text-slate-400" /> Kitchen Delivery
                                            </>
                                        ) : (
                                            <>
                                                <Bike className="w-3 h-3 text-emerald-500" /> Platform Rider
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                <span className="text-base font-extrabold text-amber-700">
                                    Rs. {Number(o.total).toLocaleString()}
                                </span>

                                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
                                    <span>Track</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
