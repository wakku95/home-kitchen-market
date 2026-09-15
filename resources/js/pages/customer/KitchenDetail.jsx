import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/common/Button';
import { Badge, Spinner, Alert } from '../../components/common/Feedback';
import { 
    MapPin, 
    Clock, 
    Utensils, 
    ArrowLeft, 
    Bike, 
    Truck, 
    Plus, 
    Check,
    ShoppingBag
} from 'lucide-react';

export const KitchenDetail = () => {
    const { slug } = useParams();
    const { addItem } = useCart();
    const [kitchen, setKitchen] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addedItemId, setAddedItemId] = useState(null);

    useEffect(() => {
        const loadKitchenDetail = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/customer/kitchens/${slug}`);
                if (res.data?.success) {
                    setKitchen(res.data.data.kitchen);
                    setCategories(res.data.data.categories);
                }
            } catch (err) {
                setError('Kitchen not found or currently unavailable.');
            } finally {
                setLoading(false);
            }
        };

        loadKitchenDetail();
    }, [slug]);

    const handleAddToCart = (item) => {
        addItem(kitchen, item);
        setAddedItemId(item.id);
        setTimeout(() => setAddedItemId(null), 1200);
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error || !kitchen) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-3">
                <Alert variant="danger">{error || 'Kitchen not found.'}</Alert>
                <Link to="/" className="inline-flex items-center text-xs font-bold text-amber-600 hover:text-amber-700">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Kitchens
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link
                to="/"
                className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Kitchens
            </Link>

            {/* Kitchen Profile Banner Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md">
                                {kitchen.cuisine_type}
                            </span>
                            <Badge variant={kitchen.is_open ? 'success' : 'neutral'} size="sm">
                                {kitchen.is_open ? 'Open Now' : 'Closed'}
                            </Badge>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {kitchen.name}
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{kitchen.area_locality}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-col sm:items-end gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Hours: {kitchen.opening_time || '11:00'} - {kitchen.closing_time || '22:00'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            {kitchen.delivery_mode === 'own_rider' ? (
                                <span className="flex items-center gap-1 text-slate-700 font-medium">
                                    <Truck className="w-3.5 h-3.5 text-slate-500" /> Delivery Arranged by Kitchen
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                    <Bike className="w-3.5 h-3.5 text-emerald-600" /> Platform Rider Delivery
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {kitchen.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                        {kitchen.description}
                    </p>
                )}
            </div>

            {/* Menu Sections by Category */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Today's Fresh Menu</h2>
                    <span className="text-xs text-slate-500">{categories.reduce((acc, c) => acc + (c.items?.length || 0), 0)} specials</span>
                </div>

                {categories.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                        This kitchen currently has no active dishes on their menu.
                    </div>
                ) : (
                    categories.map((cat) => {
                        if (!cat.items || cat.items.length === 0) return null;
                        return (
                            <div key={cat.id} className="space-y-3">
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
                                    {cat.name}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {cat.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition"
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                                                    <span className="font-extrabold text-amber-700 text-sm whitespace-nowrap">
                                                        Rs. {Number(item.price).toLocaleString()}
                                                    </span>
                                                </div>

                                                {item.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>~{item.preparation_time_minutes} min prep time</span>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <Button
                                                    variant={addedItemId === item.id ? 'success' : 'primary'}
                                                    size="sm"
                                                    onClick={() => handleAddToCart(item)}
                                                    className="w-full sm:w-auto gap-1.5"
                                                >
                                                    {addedItemId === item.id ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" /> Added to Order
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-3.5 h-3.5" /> Select Item
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
