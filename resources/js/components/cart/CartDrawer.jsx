import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';

export const CartDrawer = () => {
    const { kitchen, items, totalCount, subtotal, clearCart } = useCart();
    const location = useLocation();

    // Hide drawer on checkout or when cart is empty
    if (!kitchen || items.length === 0 || location.pathname === '/checkout') {
        return null;
    }

    return (
        <div className="fixed bottom-18 md:bottom-6 inset-x-4 max-w-md mx-auto z-40">
            <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 border border-slate-700/80 backdrop-blur-md bg-slate-900/95 animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 relative">
                        <ShoppingBag className="w-5 h-5" />
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                            {totalCount}
                        </span>
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[180px]">
                            {kitchen.name}
                        </h4>
                        <p className="text-xs text-amber-400 font-extrabold">
                            Rs. {subtotal.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearCart}
                        title="Empty Cart"
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                        to="/checkout"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    >
                        Checkout <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
};
