import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/Feedback';

export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        return (
            <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 text-center">
                <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
                <p className="text-xs text-slate-500 mt-2">
                    Your account ({user?.role}) does not have permission to view this page.
                </p>
            </div>
        );
    }

    return children;
};
