import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    Utensils, 
    ShoppingBag, 
    User, 
    LogOut, 
    LogIn, 
    Bike, 
    ChefHat, 
    ShieldCheck, 
    Settings,
    Home as HomeIcon
} from 'lucide-react';
import { Badge } from '../common/Feedback';

import { CartDrawer } from '../cart/CartDrawer';

export const AppLayout = ({ children }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'chef':
                return <Badge variant="primary" className="gap-1"><ChefHat className="w-3 h-3" /> Home Chef</Badge>;
            case 'rider':
                return <Badge variant="success" className="gap-1"><Bike className="w-3 h-3" /> Delivery Rider</Badge>;
            case 'admin':
                return <Badge variant="danger" className="gap-1"><ShieldCheck className="w-3 h-3" /> Admin</Badge>;
            default:
                return <Badge variant="neutral" className="gap-1"><User className="w-3 h-3" /> Customer</Badge>;
        }
    };

    const navItems = [
        { label: 'Explore', path: '/', icon: HomeIcon, show: true },
        { label: 'My Orders', path: '/orders', icon: ShoppingBag, show: isAuthenticated && user?.role === 'customer' },
        { label: 'My Kitchen', path: '/chef/kitchen', icon: ChefHat, show: isAuthenticated && user?.role === 'chef' },
        { label: 'Deliveries', path: '/rider/deliveries', icon: Bike, show: isAuthenticated && user?.role === 'rider' },
        { label: 'Admin', path: '/admin', icon: Settings, show: isAuthenticated && user?.role === 'admin' },
    ].filter(item => item.show);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0">
            {/* Top Navigation */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs backdrop-blur-md bg-white/95">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 font-extrabold text-lg text-slate-900 tracking-tight group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="leading-tight">HomeKitchen</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 -mt-0.5">Marketplace</span>
                        </div>
                    </Link>

                    {/* Desktop & Header User Controls */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2.5">
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-xs font-semibold text-slate-900">{user?.name}</span>
                                    <div>{getRoleBadge(user?.role)}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    title="Logout"
                                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
                                >
                                    Join Now
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
                {children}
            </main>

            {/* Persistent Cart Drawer */}
            <CartDrawer />

            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:hidden flex justify-around items-center h-16 px-2 shadow-lg">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                                isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};
