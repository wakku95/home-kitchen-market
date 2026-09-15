import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert, Badge, Spinner } from '../../components/common/Feedback';
import { 
    ShoppingBag, 
    MapPin, 
    Plus, 
    Navigation, 
    Trash2, 
    ArrowLeft, 
    Clock, 
    Bike, 
    Truck, 
    Check, 
    ShieldCheck 
} from 'lucide-react';

export const CartCheckout = () => {
    const { kitchen, items, updateQuantity, removeItem, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    // Estimation state
    const [estimate, setEstimate] = useState(null);
    const [estimating, setEstimating] = useState(false);
    const [estimateError, setEstimateError] = useState(null);

    // Submission state
    const [notes, setNotes] = useState('');
    const [phone, setPhone] = useState(user?.phone || '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // New address modal state
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        address_text: '',
        area_locality: '',
        landmark: '',
        latitude: '',
        longitude: '',
        is_default: true,
    });
    const [geoLoading, setGeoLoading] = useState(false);

    // Load saved customer addresses
    const loadAddresses = async () => {
        try {
            setLoadingAddresses(true);
            const res = await api.get('/customer/addresses');
            if (res.data?.success) {
                const list = res.data.data;
                setAddresses(list);
                const defaultAddr = list.find(a => a.is_default) || list[0];
                if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                }
            }
        } catch (err) {
            console.error('Failed to load addresses:', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

    useEffect(() => {
        loadAddresses();
    }, []);

    // Get selected address object
    const selectedAddress = addresses.find(a => a.id === Number(selectedAddressId));

    // Request server-side estimate
    useEffect(() => {
        if (!kitchen || items.length === 0 || !selectedAddress) {
            setEstimate(null);
            return;
        }

        const runEstimate = async () => {
            try {
                setEstimating(true);
                setEstimateError(null);
                const payload = {
                    kitchen_id: kitchen.id,
                    items: items.map(i => ({ item_id: i.id, quantity: i.quantity })),
                    delivery_latitude: selectedAddress.latitude,
                    delivery_longitude: selectedAddress.longitude,
                };
                const res = await api.post('/customer/orders/estimate', payload);
                if (res.data?.success) {
                    setEstimate(res.data.data);
                }
            } catch (err) {
                setEstimate(null);
                setEstimateError(err.response?.data?.message || 'Could not calculate order delivery estimate.');
            } finally {
                setEstimating(false);
            }
        };

        runEstimate();
    }, [kitchen, items, selectedAddress]);

    // Handle Location button in modal
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewAddress(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(7),
                    longitude: pos.coords.longitude.toFixed(7),
                }));
                setGeoLoading(false);
            },
            () => {
                alert('Could not acquire current location.');
                setGeoLoading(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/customer/addresses', newAddress);
            if (res.data?.success) {
                const created = res.data.data;
                setAddresses(prev => [created, ...prev]);
                setSelectedAddressId(created.id);
                setShowAddressModal(false);
                setNewAddress({
                    label: 'Home',
                    address_text: '',
                    area_locality: '',
                    landmark: '',
                    latitude: '',
                    longitude: '',
                    is_default: true,
                });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save address.');
        }
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            setError('Please choose or add a delivery address.');
            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            const payload = {
                kitchen_id: kitchen.id,
                items: items.map(i => ({ item_id: i.id, quantity: i.quantity })),
                delivery_address_text: selectedAddress.address_text,
                delivery_area: selectedAddress.area_locality,
                delivery_landmark: selectedAddress.landmark,
                delivery_latitude: selectedAddress.latitude,
                delivery_longitude: selectedAddress.longitude,
                customer_phone: phone,
                customer_notes: notes,
            };

            const res = await api.post('/customer/orders', payload);
            if (res.data?.success) {
                const order = res.data.data;
                clearCart();
                navigate(`/orders/${order.order_number}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place order.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!kitchen || items.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 my-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Your Cart is Empty</h2>
                <p className="text-xs text-slate-500">
                    Explore our home kitchens to find fresh home-cooked dishes.
                </p>
                <Link to="/" className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl">
                    Browse Kitchens
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Link
                to={`/kitchens/${kitchen.slug}`}
                className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to {kitchen.name}
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Order Checkout</h1>
                    <p className="text-xs text-slate-500">From {kitchen.name}</p>
                </div>
                <Badge variant="primary" size="sm">
                    {kitchen.delivery_mode === 'own_rider' ? 'Kitchen Delivery' : 'Platform Rider'}
                </Badge>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {estimateError && <Alert variant="danger">{estimateError}</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Items & Address */}
                <div className="md:col-span-2 space-y-6">
                    {/* 1. Review Dishes */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Order Items ({items.length})
                        </h2>

                        <div className="divide-y divide-slate-100">
                            {items.map((item) => (
                                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="space-y-0.5 flex-1">
                                        <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                                        <p className="text-xs text-slate-500">
                                            Rs. {Number(item.price).toLocaleString()} each
                                        </p>
                                    </div>

                                    {/* Quantity Stepper */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="px-2.5 py-1 text-xs font-bold hover:bg-slate-200 text-slate-700 transition"
                                            >
                                                -
                                            </button>
                                            <span className="px-2 text-xs font-bold text-slate-800">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="px-2.5 py-1 text-xs font-bold hover:bg-slate-200 text-slate-700 transition"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <span className="text-xs font-extrabold text-slate-900 w-16 text-right">
                                            Rs. {(Number(item.price) * item.quantity).toLocaleString()}
                                        </span>

                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Delivery Address */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-amber-600" /> Delivery Location
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowAddressModal(true)}
                                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Address
                            </button>
                        </div>

                        {loadingAddresses ? (
                            <div className="py-4 text-center">
                                <Spinner size="sm" />
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                                <p className="text-xs text-slate-500">You don't have any saved delivery addresses.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddressModal(true)}
                                    className="gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Address with GPS
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {addresses.map((addr) => (
                                    <label
                                        key={addr.id}
                                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                                            selectedAddressId === addr.id
                                                ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="selected_address"
                                            value={addr.id}
                                            checked={selectedAddressId === addr.id}
                                            onChange={() => setSelectedAddressId(addr.id)}
                                            className="mt-1 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="space-y-0.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                                                <span className="text-[11px] text-slate-500">({addr.area_locality})</span>
                                            </div>
                                            <p className="text-xs text-slate-600">{addr.address_text}</p>
                                            {addr.landmark && (
                                                <p className="text-[11px] text-slate-400">Landmark: {addr.landmark}</p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Instructions & Phone */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                        <Input
                            label="Contact Phone for this Order"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="03001234567"
                            required
                        />
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                Kitchen Notes / Special Instructions
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Less spicy, pack extra salad, ring bell on gate"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary & Estimate */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 sticky top-20">
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Summary & Pricing
                        </h2>

                        {estimating ? (
                            <div className="py-6 text-center space-y-2">
                                <Spinner size="md" className="mx-auto" />
                                <p className="text-xs text-slate-400">Verifying prices and distance...</p>
                            </div>
                        ) : estimate ? (
                            <div className="space-y-3">
                                <div className="space-y-2 text-xs text-slate-600 pb-3 border-b border-slate-100">
                                    <div className="flex justify-between">
                                        <span>Food Subtotal</span>
                                        <span className="font-bold text-slate-900">
                                            Rs. {estimate.subtotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1">
                                            Delivery Fee
                                            {estimate.distance_km && (
                                                <span className="text-[10px] text-slate-400">(~{estimate.distance_km} km)</span>
                                            )}
                                        </span>
                                        <span className="font-bold text-slate-900">
                                            {estimate.delivery_fee > 0
                                                ? `Rs. ${estimate.delivery_fee.toLocaleString()}`
                                                : 'Free / Kitchen Arranged'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-sm font-bold text-slate-900">Total Due</span>
                                    <span className="text-xl font-extrabold text-amber-700">
                                        Rs. {estimate.total.toLocaleString()}
                                    </span>
                                </div>

                                {/* Payment Model Assurance */}
                                <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                                    <span className="font-bold block">Direct Chef Payment:</span>
                                    <p className="leading-relaxed">
                                        You will receive the chef's verified payment details (JazzCash/Easypaisa/Bank) once the kitchen accepts and rider assignment is confirmed.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="primary"
                                    size="lg"
                                    loading={submitting}
                                    disabled={!selectedAddress || !!estimateError}
                                    onClick={handlePlaceOrder}
                                    className="w-full"
                                >
                                    Place Order
                                </Button>
                            </div>
                        ) : (
                            <div className="py-4 text-center text-xs text-slate-400">
                                Select a delivery address to calculate pricing.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Add Delivery Address</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                loading={geoLoading}
                                onClick={handleUseCurrentLocation}
                                className="gap-1 text-xs"
                            >
                                <Navigation className="w-3 h-3 text-amber-600" /> GPS Auto-fill
                            </Button>
                        </div>

                        <form onSubmit={handleSaveAddress} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Label"
                                    value={newAddress.label}
                                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                                    placeholder="e.g. Home, Work"
                                    required
                                />
                                <Input
                                    label="Area / Neighborhood"
                                    value={newAddress.area_locality}
                                    onChange={(e) => setNewAddress({ ...newAddress, area_locality: e.target.value })}
                                    placeholder="e.g. Clifton, Block 2"
                                    required
                                />
                            </div>

                            <Input
                                label="Full Street Address"
                                value={newAddress.address_text}
                                onChange={(e) => setNewAddress({ ...newAddress, address_text: e.target.value })}
                                placeholder="House/Flat #, Street Name"
                                required
                            />

                            <Input
                                label="Nearby Landmark (Optional)"
                                value={newAddress.landmark}
                                onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                                placeholder="e.g. Near Park / Bakery"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Latitude"
                                    type="number"
                                    step="any"
                                    value={newAddress.latitude}
                                    onChange={(e) => setNewAddress({ ...newAddress, latitude: e.target.value })}
                                    placeholder="24.8607"
                                    required
                                />
                                <Input
                                    label="Longitude"
                                    type="number"
                                    step="any"
                                    value={newAddress.longitude}
                                    onChange={(e) => setNewAddress({ ...newAddress, longitude: e.target.value })}
                                    placeholder="67.0011"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button variant="secondary" size="sm" onClick={() => setShowAddressModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm">
                                    Save Address
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
