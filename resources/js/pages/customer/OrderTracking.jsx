import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge, Spinner, Alert } from '../../components/common/Feedback';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    Bike, 
    Truck, 
    CreditCard, 
    Copy, 
    Check, 
    ShieldCheck, 
    XCircle,
    Utensils
} from 'lucide-react';

export const OrderTracking = () => {
    const { orderNumber } = useParams();
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    const loadOrder = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const res = await api.get(`/customer/orders/${orderNumber}`);
            if (res.data?.success) {
                setOrderData(res.data.data);
            }
        } catch (err) {
            if (!isPolling) {
                setError(err.response?.data?.message || 'Order not found.');
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();

        // Targeted 6-second polling while order is active
        const interval = setInterval(() => {
            if (orderData?.order && !['DELIVERED', 'CHEF_REJECTED', 'CUSTOMER_CANCELLED', 'NO_RIDER_FOUND', 'CHEF_CANCELLED', 'DELIVERY_FAILED'].includes(orderData.order.status)) {
                loadOrder(true);
            }
        }, 6000);

        return () => clearInterval(interval);
    }, [orderNumber]);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        try {
            setCancelling(true);
            await api.post(`/customer/orders/${orderNumber}/cancel`);
            await loadOrder();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel order.');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !orderData) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-3">
                <Alert variant="danger">{error || 'Order not found.'}</Alert>
                <Link to="/orders" className="text-xs font-bold text-amber-600 hover:text-amber-700">
                    &larr; Back to My Orders
                </Link>
            </div>
        );
    }

    const { order, payment_methods: paymentMethods, timeline } = orderData;

    // Build timeline stages
    const isPlatform = order.delivery_mode === 'platform_rider';
    const stages = isPlatform ? [
        { key: 'PENDING', label: 'Order Placed' },
        { key: 'CHEF_ACCEPTED', label: 'Kitchen Accepted' },
        { key: 'RIDER_ASSIGNED', label: 'Rider Assigned' },
        { key: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
        { key: 'PREPARING', label: 'Cooking' },
        { key: 'READY_FOR_PICKUP', label: 'Ready' },
        { key: 'OUT_FOR_DELIVERY', label: 'On The Way' },
        { key: 'DELIVERED', label: 'Delivered' },
    ] : [
        { key: 'PENDING', label: 'Order Placed' },
        { key: 'CHEF_ACCEPTED', label: 'Kitchen Accepted' },
        { key: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
        { key: 'PREPARING', label: 'Cooking' },
        { key: 'READY_FOR_PICKUP', label: 'Ready' },
        { key: 'OUT_FOR_DELIVERY', label: 'Sent With Rider' },
        { key: 'DELIVERED', label: 'Delivered' },
    ];

    const statusOrder = [
        'PENDING',
        'CHEF_ACCEPTED',
        'FINDING_RIDER',
        'RIDER_ASSIGNED',
        'AWAITING_CUSTOMER_PAYMENT',
        'PAYMENT_SUBMITTED',
        'PAYMENT_CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
    ];

    const currentStatusIndex = statusOrder.indexOf(order.status);
    const isTerminal = ['CHEF_REJECTED', 'CUSTOMER_CANCELLED', 'NO_RIDER_FOUND', 'CHEF_CANCELLED', 'DELIVERY_FAILED'].includes(order.status);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link
                to="/orders"
                className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to My Orders
            </Link>

            {/* Header Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <span className="text-[11px] font-mono font-bold text-slate-400">Order #{order.order_number}</span>
                        <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{order.kitchen?.name}</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant={isTerminal ? 'danger' : order.status === 'DELIVERED' ? 'success' : 'primary'} size="md">
                            {order.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            {isPlatform ? <Bike className="w-3.5 h-3.5 text-emerald-600" /> : <Truck className="w-3.5 h-3.5 text-slate-600" />}
                            {isPlatform ? 'Platform Rider' : 'Kitchen Arranged'}
                        </span>
                    </div>
                </div>

                {/* Terminal Alerts */}
                {order.status === 'NO_RIDER_FOUND' && (
                    <Alert variant="danger">
                        Unfortunately, no delivery rider was found in the area for this order. Since payment is only requested after rider confirmation, no money was charged.
                    </Alert>
                )}

                {order.status === 'CHEF_REJECTED' && (
                    <Alert variant="danger">
                        The kitchen was unable to accept your order at this time. Zero payment was collected.
                    </Alert>
                )}

                {order.status === 'CUSTOMER_CANCELLED' && (
                    <Alert variant="info">
                        This order was cancelled by you before food preparation started.
                    </Alert>
                )}

                {/* Progress Stepper (if not terminal) */}
                {!isTerminal && (
                    <div className="pt-2">
                        <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar gap-2">
                            {stages.map((stage, idx) => {
                                const stageIndex = statusOrder.indexOf(stage.key);
                                const isPassed = currentStatusIndex >= stageIndex;
                                const isCurrent = order.status === stage.key;

                                return (
                                    <div key={stage.key} className="flex flex-col items-center text-center min-w-[70px]">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                            isCurrent
                                                ? 'bg-amber-600 text-white ring-4 ring-amber-100 scale-110 shadow-sm'
                                                : isPassed
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                                        </div>
                                        <span className={`text-[10px] mt-1.5 font-bold leading-tight ${
                                            isCurrent ? 'text-amber-700' : isPassed ? 'text-slate-800' : 'text-slate-400'
                                        }`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Direct Payment Action Box (When Awaiting Payment) */}
            {order.status === 'AWAITING_CUSTOMER_PAYMENT' && paymentMethods && paymentMethods.length > 0 && (
                <div className="bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                                Please Transfer Payment to the Chef
                            </h2>
                            <p className="text-xs text-amber-900/80 leading-relaxed">
                                Rider assignment and kitchen acceptance confirmed! Transfer <span className="font-extrabold text-amber-950">Rs. {Number(order.total).toLocaleString()}</span> directly to the chef's account below so preparation can start.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        {paymentMethods.map((pm, idx) => (
                            <div key={pm.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm">
                                        {pm.method_type.replace(/_/g, ' ')}
                                    </span>
                                    <h4 className="font-bold text-xs text-slate-900">{pm.account_title}</h4>
                                    <span className="font-mono text-sm font-extrabold text-slate-800 tracking-wide select-all">
                                        {pm.account_number}
                                    </span>
                                    {pm.bank_name && (
                                        <p className="text-[11px] text-slate-500">{pm.bank_name}</p>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(pm.account_number, idx)}
                                    className="gap-1.5 shrink-0"
                                >
                                    {copiedIndex === idx ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" /> Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/80 rounded-2xl p-4 border border-amber-200 text-xs text-slate-600 space-y-2">
                        <span className="font-bold text-slate-800 block">Next Steps:</span>
                        <p>1. Open your banking or JazzCash/Easypaisa app and transfer the total amount.</p>
                        <p>2. The chef will verify the funds on their account and begin preparing your food.</p>
                    </div>
                </div>
            )}

            {/* Preparation / Ready Notice */}
            {order.status === 'PREPARING' && (
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4.5 flex items-center gap-3 text-xs text-amber-900">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <span className="font-bold block">Chef is preparing your food!</span>
                        <p className="text-amber-800/80 mt-0.5">Your fresh meal is cooking in the home kitchen.</p>
                    </div>
                </div>
            )}

            {order.status === 'OUT_FOR_DELIVERY' && (
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4.5 flex items-center gap-3 text-xs text-emerald-900">
                    {isPlatform ? <Bike className="w-5 h-5 text-emerald-600 shrink-0" /> : <Truck className="w-5 h-5 text-emerald-600 shrink-0" />}
                    <div>
                        <span className="font-bold block">Order is on the way!</span>
                        <p className="text-emerald-800/80 mt-0.5">
                            {isPlatform
                                ? 'The platform delivery rider has collected your order and is heading to your address.'
                                : 'The kitchen has dispatched your food with their own delivery person.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Order Items & Receipt Details */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Order Summary
                </h2>

                <div className="divide-y divide-slate-100">
                    {order.items?.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                            <span className="text-slate-800">
                                <span className="font-bold text-amber-700">{item.quantity}x</span> {item.item_name}
                            </span>
                            <span className="font-bold text-slate-900">
                                Rs. {Number(item.total_price).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                        <span>Food Subtotal</span>
                        <span className="font-bold text-slate-900">Rs. {Number(order.subtotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Delivery Arrangement</span>
                        <span className="font-bold text-slate-900">
                            {Number(order.delivery_fee) > 0 ? `Rs. ${Number(order.delivery_fee).toLocaleString()}` : 'Free / Kitchen Arranged'}
                        </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 text-sm">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="font-extrabold text-amber-700 text-base">
                            Rs. {Number(order.total).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    <span className="font-bold text-slate-700 block">Delivering To:</span>
                    <p>{order.delivery_address_text}, {order.delivery_area}</p>
                    {order.delivery_landmark && <p>Landmark: {order.delivery_landmark}</p>}
                </div>

                {/* Cancel Button (only if pending or awaiting payment) */}
                {['PENDING', 'AWAITING_CUSTOMER_PAYMENT'].includes(order.status) && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <Button
                            variant="danger"
                            size="sm"
                            loading={cancelling}
                            onClick={handleCancelOrder}
                            className="gap-1.5"
                        >
                            <XCircle className="w-3.5 h-3.5" /> Cancel Order
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
