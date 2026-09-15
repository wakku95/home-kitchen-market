import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Badge, Spinner } from '../../components/common/Feedback';
import { Search, MapPin, Navigation, Utensils, Clock, ChevronRight, Bike, Truck } from 'lucide-react';

export const KitchenList = () => {
    const [kitchens, setKitchens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState('All');
    const [geoLoading, setGeoLoading] = useState(false);
    const [userCoords, setUserCoords] = useState(null);

    const cuisines = ['All', 'Pakistani', 'Biryani', 'BBQ', 'Desserts', 'Snacks', 'Baking'];

    const fetchKitchens = async (coords = userCoords, search = searchTerm, cuisine = selectedCuisine) => {
        try {
            setLoading(true);
            const params = {};
            if (search) params.q = search;
            if (cuisine && cuisine !== 'All') params.cuisine = cuisine;
            if (coords) {
                params.lat = coords.latitude;
                params.lng = coords.longitude;
            }

            const res = await api.get('/customer/kitchens', { params });
            if (res.data?.success) {
                setKitchens(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching kitchens:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKitchens();
    }, [selectedCuisine]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchKitchens(userCoords, searchTerm, selectedCuisine);
    };

    const handleNearMe = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                };
                setUserCoords(coords);
                setGeoLoading(false);
                fetchKitchens(coords, searchTerm, selectedCuisine);
            },
            (err) => {
                alert('Could not detect location. Please check browser permissions.');
                setGeoLoading(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    return (
        <div className="space-y-6">
            {/* Search and Near Me Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search dishes, kitchens, or locality (e.g. Biryani, Gulshan)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 placeholder-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="submit" variant="primary" size="md" className="px-5">
                            Search
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="md"
                            loading={geoLoading}
                            onClick={handleNearMe}
                            className="gap-1.5 whitespace-nowrap"
                        >
                            <Navigation className="w-4 h-4 text-amber-600" />
                            {userCoords ? 'Near Me Active' : 'Near Me'}
                        </Button>
                    </div>
                </form>

                {/* Cuisine Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {cuisines.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedCuisine(c)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                selectedCuisine === c
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kitchens Grid */}
            {loading ? (
                <div className="min-h-[40vh] flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            ) : kitchens.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <Utensils className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No Kitchens Found</h3>
                    <p className="text-xs text-slate-500">
                        {userCoords
                            ? 'No approved home kitchens found within your 5 km neighborhood radius. Try clearing location.'
                            : 'No home kitchens matched your search criteria. Try a different dish or cuisine.'}
                    </p>
                    {userCoords && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setUserCoords(null);
                                fetchKitchens(null, searchTerm, selectedCuisine);
                            }}
                        >
                            View All Kitchens
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kitchens.map((k) => (
                        <Link
                            key={k.id}
                            to={`/kitchens/${k.slug}`}
                            className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-amber-400 hover:shadow-md transition group flex flex-col justify-between"
                        >
                            <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                        {k.cuisine_type}
                                    </span>
                                    <Badge variant={k.is_open ? 'success' : 'neutral'} size="sm">
                                        {k.is_open ? 'Open Now' : 'Closed'}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-600 transition-colors leading-tight">
                                        {k.name}
                                    </h3>
                                    {k.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                            {k.description}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1 text-xs text-slate-600 pt-1">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{k.area_locality}</span>
                                    </div>
                                    {k.approx_distance_km !== null && (
                                        <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                                            <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span>~{k.approx_distance_km} km away</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                    {k.delivery_mode === 'own_rider' ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                                            <Truck className="w-3.5 h-3.5 text-slate-500" /> Kitchen Delivery
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                            <Bike className="w-3.5 h-3.5 text-emerald-600" /> Platform Rider
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform">
                                    <span>View Menu</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
