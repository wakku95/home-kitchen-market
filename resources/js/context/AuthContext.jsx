import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('auth_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            if (res.data?.success) {
                const userData = res.data.data.user;
                setUser(userData);
                localStorage.setItem('auth_user', JSON.stringify(userData));
            }
        } catch {
            setUser(null);
            setToken(null);
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            refreshUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        if (res.data?.success) {
            const { user: userData, token: userToken } = res.data.data;
            setUser(userData);
            setToken(userToken);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('auth_token', userToken);
            return userData;
        }
        throw new Error(res.data?.message || 'Login failed.');
    };

    const register = async (payload) => {
        const res = await api.post('/auth/register', payload);
        if (res.data?.success) {
            const { user: userData, token: userToken } = res.data.data;
            setUser(userData);
            setToken(userToken);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('auth_token', userToken);
            return userData;
        }
        throw new Error(res.data?.message || 'Registration failed.');
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            // Ignore failure on logout
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_token');
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                role: user?.role || null,
                loading,
                login,
                register,
                logout,
                refreshUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
