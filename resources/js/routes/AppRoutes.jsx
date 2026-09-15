import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Home } from '../pages/Home';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { KitchenDetail } from '../pages/customer/KitchenDetail';
import { CartCheckout } from '../pages/customer/CartCheckout';
import { OrderHistory } from '../pages/customer/OrderHistory';
import { OrderTracking } from '../pages/customer/OrderTracking';
import { KitchenManager } from '../pages/chef/KitchenManager';
import { MenuManager } from '../pages/chef/MenuManager';
import { PaymentMethodsManager } from '../pages/chef/PaymentMethodsManager';
import { RiderPortal } from '../pages/rider/RiderPortal';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes = () => {
    return (
        <AppLayout>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/kitchens/:slug" element={<KitchenDetail />} />

                {/* Customer Routes (Phase 3 Completed) */}
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <CartCheckout />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <OrderHistory />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders/:orderNumber"
                    element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <OrderTracking />
                        </ProtectedRoute>
                    }
                />

                {/* Chef Routes (Phase 2 Completed) */}
                <Route
                    path="/chef/kitchen"
                    element={
                        <ProtectedRoute allowedRoles={['chef']}>
                            <KitchenManager />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chef/menu"
                    element={
                        <ProtectedRoute allowedRoles={['chef']}>
                            <MenuManager />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chef/payments"
                    element={
                        <ProtectedRoute allowedRoles={['chef']}>
                            <PaymentMethodsManager />
                        </ProtectedRoute>
                    }
                />

                {/* Rider Routes (Phase 4 Completed) */}
                <Route
                    path="/rider/deliveries"
                    element={
                        <ProtectedRoute allowedRoles={['rider']}>
                            <RiderPortal />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Routes (Phase 6 placeholders) */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
                                <h2 className="text-base font-bold text-slate-900">Admin Platform Dashboard</h2>
                                <p className="text-xs text-slate-500 mt-1">Platform verification & metrics will be available in Phase 6.</p>
                            </div>
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppLayout>
    );
};
