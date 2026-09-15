import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert, Badge, Spinner } from '../../components/common/Feedback';
import { ChefHat, MapPin, Navigation, Clock, Utensils, CreditCard, ShieldCheck, Bike, Truck } from 'lucide-react';

export const KitchenManager = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [kitchen, setKitchen] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [error, setError] = useState(null);
    const [geoLoading, setGeoLoading] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cuisine_type: 'Pakistani',
        phone_contact: '',
        opening_time: '11:00',
        closing_time: '22:00',
        is_open: true,
        minimum_order_amount: '0',
        delivery_radius_km: '5.0',
        delivery_mode: 'platform_rider',
        latitude: '',
        longitude: '',
        address_text: '',
        area_locality: '',
        landmark: '',
    });

    const loadKitchen = async () => {
        try {
            setLoading(true);
            const res = await api.get('/chef/kitchen');
            if (res.data?.success && res.data.data.kitchen) {
                const k = res.data.data.kitchen;
                setKitchen(k);
                setFormData({
                    name: k.name || '',
                    description: k.description || '',
                    cuisine_type: k.cuisine_type || 'Pakistani',
                    phone_contact: k.phone_contact || '',
                    opening_time: k.opening_time || '11:00',
                    closing_time: k.closing_time || '22:00',
                    is_open: k.is_open ?? true,
                    minimum_order_amount: k.minimum_order_amount || '0',
                    delivery_radius_km: k.delivery_radius_km || '5.0',
                    delivery_mode: k.delivery_mode || 'platform_rider',
                    latitude: k.latitude || '',
                    longitude: k.longitude || '',
                    address_text: k.address_text || '',
                    area_locality: k.area_locality || '',
                    landmark: k.landmark || '',
                });
            }
        } catch (err) {
            setError('Failed to load kitchen profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKitchen();
    }, []);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(7),
                    longitude: pos.coords.longitude.toFixed(7),
                }));
                setGeoLoading(false);
            },
            (err) => {
                setError('Could not obtain current location. Please enter coordinates manually.');
                setGeoLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setStatusMessage(null);
        setSaving(true);

        try {
            if (kitchen) {
                const res = await api.put('/chef/kitchen', formData);
                setKitchen(res.data.data);
                setStatusMessage('Kitchen profile updated successfully.');
            } else {
                const res = await api.post('/chef/kitchen', formData);
                setKitchen(res.data.data);
                setStatusMessage('Kitchen created successfully!');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save kitchen.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Chef Dashboard Sub-Nav Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">
                            {kitchen ? kitchen.name : 'Kitchen Setup'}
                        </h1>
                        <p className="text-xs text-slate-500">Configure profile, menu, and payment options</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/chef/kitchen"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs"
                    >
                        Kitchen Profile
                    </Link>
                    <Link
                        to="/chef/menu"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Menu Manager
                    </Link>
                    <Link
                        to="/chef/payments"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Payment Accounts
                    </Link>
                </div>
            </div>

            {statusMessage && <Alert variant="success">{statusMessage}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Basic Kitchen Details */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-amber-600" /> Kitchen Details
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Kitchen Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Fatima's Home Kitchen"
                            required
                        />
                        <Input
                            label="Cuisine Specialty"
                            value={formData.cuisine_type}
                            onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                            placeholder="e.g. Pakistani, Biryani, BBQ, Desserts"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                            About Your Kitchen
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell customers about your recipes, ingredients, and cooking philosophy..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                            label="Private Contact Phone"
                            value={formData.phone_contact}
                            onChange={(e) => setFormData({ ...formData, phone_contact: e.target.value })}
                            placeholder="03001234567"
                            helperText="Kept private; used for operations only"
                            required
                        />
                        <Input
                            label="Opening Time"
                            type="time"
                            value={formData.opening_time}
                            onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                        />
                        <Input
                            label="Closing Time"
                            type="time"
                            value={formData.closing_time}
                            onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <Input
                            label="Minimum Order Amount (PKR)"
                            type="number"
                            min="0"
                            value={formData.minimum_order_amount}
                            onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                        />
                        <div className="flex items-center gap-3 pt-6">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_open}
                                    onChange={(e) => setFormData({ ...formData, is_open: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                            <div>
                                <span className="text-xs font-bold text-slate-800">
                                    {formData.is_open ? 'Kitchen is OPEN for Orders' : 'Kitchen is CLOSED'}
                                </span>
                                <p className="text-[11px] text-slate-500">Toggle whether customers can place new orders right now</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Delivery Arrangement Settings (Chef Delivery Mode) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-600" /> Delivery Settings
                    </h2>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Who delivers your food orders?
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Platform Riders */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    formData.delivery_mode === 'platform_rider'
                                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_mode"
                                    value="platform_rider"
                                    checked={formData.delivery_mode === 'platform_rider'}
                                    onChange={(e) => setFormData({ ...formData, delivery_mode: e.target.value })}
                                    className="mt-1 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-900">Platform Riders</span>
                                        <Badge variant="primary" size="sm">Marketplace Default</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Find an available rider through the marketplace network. Sequential dispatch within 5 km.
                                    </p>
                                </div>
                            </label>

                            {/* Chef Own Rider */}
                            <label
                                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    formData.delivery_mode === 'own_rider'
                                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_mode"
                                    value="own_rider"
                                    checked={formData.delivery_mode === 'own_rider'}
                                    onChange={(e) => setFormData({ ...formData, delivery_mode: e.target.value })}
                                    className="mt-1 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-900">My Own Rider</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        I have my own delivery person. I will arrange delivery myself. (No platform rider matching or fees).
                                    </p>
                                </div>
                            </label>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 italic">
                            * Notice: Changing your delivery arrangement will apply only to new incoming orders.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Input
                            label="Maximum Delivery Radius (KM)"
                            type="number"
                            step="0.5"
                            min="1"
                            max="10"
                            value={formData.delivery_radius_km}
                            onChange={(e) => setFormData({ ...formData, delivery_radius_km: e.target.value })}
                            helperText="Recommended: 3 to 5 km for optimal food temperature and freshness"
                        />
                    </div>
                </div>

                {/* 3. Location & Coordinates */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-600" /> Kitchen Location
                        </h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={geoLoading}
                            onClick={handleUseCurrentLocation}
                            className="gap-1.5"
                        >
                            <Navigation className="w-3.5 h-3.5 text-amber-600" /> Use Current Location
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Latitude"
                            type="number"
                            step="any"
                            value={formData.latitude}
                            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                            placeholder="e.g. 24.8607"
                            required
                        />
                        <Input
                            label="Longitude"
                            type="number"
                            step="any"
                            value={formData.longitude}
                            onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                            placeholder="e.g. 67.0011"
                            required
                        />
                    </div>

                    <Input
                        label="Public Area / Neighborhood"
                        value={formData.area_locality}
                        onChange={(e) => setFormData({ ...formData, area_locality: e.target.value })}
                        placeholder="e.g. Gulshan-e-Iqbal, Block 4, Karachi"
                        helperText="Visible publicly to customers searching nearby food"
                        required
                    />

                    <Input
                        label="Full Physical Kitchen Address"
                        value={formData.address_text}
                        onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                        placeholder="House / Flat #, Street, Sector"
                        helperText="Private: only shown to assigned rider or operational receipts"
                        required
                    />

                    <Input
                        label="Nearby Landmark"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        placeholder="e.g. Opposite Masjid Bilal"
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={saving}
                        className="sm:w-auto px-8"
                    >
                        {kitchen ? 'Save Kitchen Profile' : 'Register Kitchen'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
