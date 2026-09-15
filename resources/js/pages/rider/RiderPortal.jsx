import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge, Spinner, Alert } from '../../components/common/Feedback';
import {
    Bike,
    MapPin,
    Clock,
    Phone,
    Navigation,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Power,
    DollarSign,
    PackageCheck
} from 'lucide-react';

export const RiderPortal = () => {
    const [profile, setProfile] = useState(null);
    const [pendingOffer, setPendingOffer] = useState(null);
    const [activeOrder, setActiveOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(60);
    const [unableReason, setUnableReason] = useState('');
    const [showUnableModal, setShowUnableModal] = useState(false);

    const loadRiderState = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get('/rider/profile');
            if (res.data?.success) {
                setProfile(res.data.data.profile);
                setPendingOffer(res.data.data.pending_offer);
                setActiveOrder(res.data.data.active_order);

                // Compute seconds remaining for offer
                if (res.data.data.pending_offer?.expires_at) {
                    const diff = Math.max(0, Math.floor((new Date(res.data.data.pending_offer.expires_at) - new Date()) / 1000));
                    setSecondsRemaining(diff);
                }
            }
        } catch (err) {
            setError('Failed to fetch rider status.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Initial load + targeted 6s polling
    useEffect(() => {
        loadRiderState();
        const interval = setInterval(() => {
            loadRiderState(true);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Countdown timer for pending offer
    useEffect(() => {
        if (!pendingOffer || secondsRemaining <= 0) return;
        const timer = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    loadRiderState(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [pendingOffer, secondsRemaining]);

    const handleToggleStatus = async () => {
        try {
            setActionLoading(true);
            setError(null);
            const nextStatus = profile?.availability_status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
            const res = await api.post('/rider/status', { status: nextStatus });
            if (res.data?.success) {
                setProfile(res.data.data);
                setSuccessMessage(`Availability status updated to ${nextStatus}.`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Could not update availability.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setGpsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const res = await api.post('/rider/location', {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    });
                    if (res.data?.success) {
                        setProfile(res.data.data);
                        setSuccessMessage('GPS location refreshed successfully.');
                        setTimeout(() => setSuccessMessage(null), 3000);
                    }
                } catch (err) {
                    setError('Failed to update coordinates with server.');
                } finally {
                    setGpsLoading(false);
                }
            },
            (err) => {
                setError(`Location error: ${err.message}`);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleAcceptOffer = async (assignmentId) => {
        try {
            setActionLoading(true);
            setError(null);
            const res = await api.post(`/rider/assignments/${assignmentId}/accept`);
            if (res.data?.success) {
                setSuccessMessage('Delivery offer accepted! Head to the kitchen.');
                await loadRiderState(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to accept offer.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectOffer = async (assignmentId) => {
        try {
            setActionLoading(true);
            setError(null);
            const res = await api.post(`/rider/assignments/${assignmentId}/reject`, {
                reason: 'Declined by rider',
            });
            if (res.data?.success) {
                setPendingOffer(null);
                setSuccessMessage('Offer declined.');
                await loadRiderState(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to decline offer.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkPickedUp = async (orderNumber) => {
        try {
            setActionLoading(true);
            setError(null);
            const res = await api.post(`/rider/orders/${orderNumber}/picked-up`);
            if (res.data?.success) {
                setSuccessMessage('Order picked up! Now deliver to the customer.');
                await loadRiderState(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark picked up.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkDelivered = async (orderNumber) => {
        try {
            setActionLoading(true);
            setError(null);
            const res = await api.post(`/rider/orders/${orderNumber}/delivered`);
            if (res.data?.success) {
                setSuccessMessage('Delivery completed! Great job.');
                setActiveOrder(null);
                await loadRiderState(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark delivered.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReportUnable = async () => {
        if (!unableReason || unableReason.length < 5) {
            setError('Please provide a specific reason (min 5 characters).');
            return;
        }

        try {
            setActionLoading(true);
            setError(null);
            const res = await api.post(`/rider/orders/${activeOrder.order_number}/unable-to-deliver`, {
                reason: unableReason,
            });
            if (res.data?.success) {
                setShowUnableModal(false);
                setUnableReason('');
                setSuccessMessage('Order unassigned and sent to another rider.');
                await loadRiderState(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to report unable to deliver.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const isAvailable = profile?.availability_status === 'AVAILABLE';
    const isBusy = profile?.availability_status === 'BUSY';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header / Status Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <Bike className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Rider Delivery Portal</h1>
                            <p className="text-xs text-slate-500">Karachi Marketplace Delivery Network</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleUpdateLocation}
                        loading={gpsLoading}
                        className="flex-1 sm:flex-none gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                        GPS
                    </Button>

                    <Button
                        variant={isAvailable ? 'danger' : 'success'}
                        size="sm"
                        onClick={handleToggleStatus}
                        loading={actionLoading}
                        disabled={isBusy}
                        className="flex-1 sm:flex-none gap-1.5"
                    >
                        <Power className="w-3.5 h-3.5" />
                        {isAvailable ? 'Go Offline' : 'Go Online'}
                    </Button>
                </div>
            </div>

            {/* Notification Messages */}
            {error && <Alert variant="danger" message={error} onClose={() => setError(null)} />}
            {successMessage && <Alert variant="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}

            {/* Location Status pill */}
            <div className="bg-slate-100 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>
                        {profile?.current_latitude && profile?.current_longitude
                            ? `Lat: ${Number(profile.current_latitude).toFixed(4)}, Lng: ${Number(profile.current_longitude).toFixed(4)}`
                            : 'GPS coordinates not set. Click GPS to update location.'}
                    </span>
                </div>
                <Badge variant={isAvailable ? 'success' : isBusy ? 'primary' : 'neutral'}>
                    {profile?.availability_status || 'OFFLINE'}
                </Badge>
            </div>

            {/* 1. Pending Delivery Offer Modal / Card */}
            {pendingOffer && (
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border-2 border-amber-500 p-6 space-y-4 shadow-md animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                            <h2 className="font-extrabold text-base text-slate-900">New Delivery Offer!</h2>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{secondsRemaining}s remaining</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Order:</span>
                            <span className="font-mono font-bold text-slate-900">{pendingOffer.order?.order_number}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Kitchen Pickup:</span>
                            <span className="font-bold text-slate-900">{pendingOffer.order?.kitchen?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Pickup Area:</span>
                            <span className="text-slate-700">{pendingOffer.order?.kitchen?.area_locality}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Distance to Kitchen:</span>
                            <span className="font-bold text-amber-700">~{pendingOffer.distance_to_kitchen_km} km</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="text-slate-500">Your Delivery Fee:</span>
                            <span className="font-extrabold text-base text-emerald-600">
                                Rs. {Number(pendingOffer.order?.delivery_fee || 150).toLocaleString()}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">
                            * Delivery fee is collected in cash directly from the chef upon pickup.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="danger"
                            onClick={() => handleRejectOffer(pendingOffer.id)}
                            loading={actionLoading}
                            className="flex-1 gap-1.5"
                        >
                            <XCircle className="w-4 h-4" /> Decline
                        </Button>
                        <Button
                            variant="success"
                            onClick={() => handleAcceptOffer(pendingOffer.id)}
                            loading={actionLoading}
                            className="flex-1 gap-1.5"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Accept Offer
                        </Button>
                    </div>
                </div>
            )}

            {/* 2. Active Order Screen */}
            {activeOrder ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Active Delivery</span>
                            <h2 className="text-base font-extrabold text-slate-900">{activeOrder.order_number}</h2>
                        </div>
                        <Badge variant="primary">{activeOrder.status}</Badge>
                    </div>

                    {/* Step 1: Pickup from Kitchen */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-500">Pickup Destination</span>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.kitchen?.latitude},${activeOrder.kitchen?.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
                            >
                                <Navigation className="w-3.5 h-3.5" /> Open Maps
                            </a>
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-900">{activeOrder.kitchen?.name}</p>
                            <p className="text-xs text-slate-600">{activeOrder.kitchen?.address_text}</p>
                            <p className="text-xs text-slate-500">{activeOrder.kitchen?.area_locality}</p>
                        </div>
                        {activeOrder.kitchen?.phone_contact && (
                            <div className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <a href={`tel:${activeOrder.kitchen.phone_contact}`} className="font-semibold text-amber-600">
                                    {activeOrder.kitchen.phone_contact}
                                </a>
                            </div>
                        )}
                        <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                            <span>Collect Delivery Fee from Chef:</span>
                            <span className="font-bold text-sm">Rs. {Number(activeOrder.delivery_fee).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Step 2: Deliver to Customer */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-500">Drop-off Destination</span>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.delivery_latitude},${activeOrder.delivery_longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 underline"
                            >
                                <Navigation className="w-3.5 h-3.5" /> Open Maps
                            </a>
                        </div>
                        <div>
                            <p className="text-xs text-slate-700 font-semibold">{activeOrder.delivery_address_text}</p>
                            <p className="text-xs text-slate-500">{activeOrder.delivery_area}</p>
                            {activeOrder.delivery_landmark && (
                                <p className="text-[11px] text-slate-400">Landmark: {activeOrder.delivery_landmark}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${activeOrder.customer_phone}`} className="font-semibold text-amber-600">
                                {activeOrder.customer_phone}
                            </a>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                        {['RIDER_ASSIGNED', 'AWAITING_CUSTOMER_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(activeOrder.status) && (
                            <div className="space-y-2">
                                <Button
                                    variant="primary"
                                    onClick={() => handleMarkPickedUp(activeOrder.order_number)}
                                    loading={actionLoading}
                                    className="w-full gap-2 py-3"
                                >
                                    <PackageCheck className="w-4 h-4" /> Picked Up & Out For Delivery
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowUnableModal(true)}
                                    className="w-full text-rose-600 hover:text-rose-700 text-xs"
                                >
                                    Unable to deliver this order?
                                </Button>
                            </div>
                        )}

                        {['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(activeOrder.status) && (
                            <Button
                                variant="success"
                                onClick={() => handleMarkDelivered(activeOrder.order_number)}
                                loading={actionLoading}
                                className="w-full gap-2 py-3"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Mark as Delivered to Customer
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                !pendingOffer && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <Bike className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">
                            {isAvailable ? 'Looking for nearby delivery offers...' : 'You are currently Offline'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {isAvailable
                                ? 'Keep this page open. When a nearby kitchen needs a delivery, an offer card will automatically appear with a 60-second timer.'
                                : 'Switch your availability to "Go Online" and ensure your GPS coordinates are updated to start receiving delivery offers.'}
                        </p>
                    </div>
                )
            )}

            {/* Unable to Deliver Modal */}
            {showUnableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="font-bold text-base text-slate-900">Unable to Deliver Order</h3>
                        </div>
                        <p className="text-xs text-slate-500">
                            Reporting unable to deliver will immediately reassign this order to another available rider in the network.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for cancellation</label>
                            <textarea
                                value={unableReason}
                                onChange={(e) => setUnableReason(e.target.value)}
                                placeholder="e.g. Motorcycle breakdown, puncture, emergency..."
                                rows={3}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowUnableModal(false)}
                            >
                                Dismiss
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleReportUnable}
                                loading={actionLoading}
                            >
                                Confirm Reassignment
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
