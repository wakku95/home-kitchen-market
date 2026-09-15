import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { ChefHat, Bike, ShoppingBag, ShieldCheck, MapPin, ArrowRight, Clock, Award } from 'lucide-react';
import { Badge } from '../components/common/Feedback';
import { KitchenList } from './customer/KitchenList';

export const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get('/settings/public')
            .then(res => {
                if (res.data?.success) {
                    setSettings(res.data.data);
                }
            })
            .catch(() => {});
    }, []);

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-slate-900 text-white p-6 sm:p-10 shadow-lg">
                <div className="relative z-10 max-w-2xl space-y-4">
                    <Badge variant="warning" className="bg-amber-500/20 text-amber-200 border-amber-400/30 text-[11px] font-semibold tracking-wide uppercase px-3 py-1">
                        Authentic Home Cooked Food
                    </Badge>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                        Fresh meals prepared with love by home chefs in your neighborhood.
                    </h1>
                    <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
                        Discover verified home kitchens nearby. Support independent chefs and riders with zero middleman wallet delays.
                    </p>

                    <div className="pt-2 flex flex-wrap gap-3">
                        {!isAuthenticated ? (
                            <>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center px-5 py-3 rounded-xl font-bold text-sm bg-white text-slate-900 hover:bg-amber-50 transition shadow-sm"
                                >
                                    Start Ordering <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center px-5 py-3 rounded-xl font-semibold text-sm bg-amber-500/20 hover:bg-amber-500/30 text-white border border-white/20 transition backdrop-blur-xs"
                                >
                                    Register Your Kitchen
                                </Link>
                            </>
                        ) : (
                            <Link
                                to={
                                    user.role === 'chef' ? '/chef/kitchen' :
                                    user.role === 'rider' ? '/rider/deliveries' :
                                    user.role === 'admin' ? '/admin' : '/orders'
                                }
                                className="inline-flex items-center px-5 py-3 rounded-xl font-bold text-sm bg-white text-slate-900 hover:bg-amber-50 transition shadow-sm"
                            >
                                Go to {user.role === 'chef' ? 'Kitchen Dashboard' : user.role === 'rider' ? 'Deliveries' : user.role === 'admin' ? 'Admin Panel' : 'My Orders'}
                                <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Decorative background circle */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-amber-500/10 blur-2xl pointer-events-none"></div>
            </div>

            {/* Quick Metrics / Transparent Model Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Neighborhood Radius</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Matching within {settings?.delivery_radius_max_km || 5} km straight-line distance for maximum freshness.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Direct Chef Payments</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Pay chef directly via JazzCash, Easypaisa, Raast, or Bank transfer. No escrow delay.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Tiered Delivery Fees</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Flat Rs. {settings?.delivery_fee_0_3_km || 150} (0-3 km) and Rs. {settings?.delivery_fee_3_5_km || 200} (3-5 km). Paid directly to rider.
                        </p>
                    </div>
                </div>
            </div>

            {/* Authenticated User Status Card */}
            {isAuthenticated && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-base">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{user.name}</span>
                                <span className="text-xs text-slate-500">({user.email})</span>
                            </div>
                            <span className="text-xs text-slate-500">
                                Role: <span className="capitalize font-semibold text-slate-700">{user.role}</span> &bull; Status: <span className="capitalize font-semibold text-emerald-600">{user.status}</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {user.role === 'customer' && (
                            <Link
                                to="/"
                                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
                            >
                                Browse Kitchens
                            </Link>
                        )}
                        {user.role === 'chef' && (
                            <Link
                                to="/chef/kitchen"
                                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition flex items-center gap-1.5"
                            >
                                <ChefHat className="w-3.5 h-3.5" /> Manage Kitchen
                            </Link>
                        )}
                        {user.role === 'rider' && (
                            <Link
                                to="/rider/deliveries"
                                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5"
                            >
                                <Bike className="w-3.5 h-3.5" /> Rider Panel
                            </Link>
                        )}
                        {user.role === 'admin' && (
                            <Link
                                to="/admin"
                                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Kitchen Discovery Section */}
            <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Explore Home Kitchens</h2>
                        <p className="text-xs text-slate-500">Fresh daily menus prepared in hygienic home environments</p>
                    </div>
                </div>
                <KitchenList />
            </div>
        </div>
    );
};
