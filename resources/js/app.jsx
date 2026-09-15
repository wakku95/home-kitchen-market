import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppRoutes } from './routes/AppRoutes';
import '../css/app.css';

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <BrowserRouter>
                <AuthProvider>
                    <CartProvider>
                        <AppRoutes />
                    </CartProvider>
                </AuthProvider>
            </BrowserRouter>
        </React.StrictMode>
    );
}
