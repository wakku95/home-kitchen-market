import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { Utensils, ArrowRight } from 'lucide-react';

export const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const user = await login(email, password);
            const redirect = location.state?.from?.pathname || (
                user.role === 'chef' ? '/chef/kitchen' :
                user.role === 'rider' ? '/rider/deliveries' :
                user.role === 'admin' ? '/admin' : '/'
            );
            navigate(redirect, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto my-8">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-3">
                        <Utensils className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-xs text-slate-500 mt-1">Log in using your email address or phone number</p>
                </div>

                {error && <Alert variant="danger" className="mb-5">{error}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Email or Phone Number"
                        type="text"
                        placeholder="e.g. 03001234567 or you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        className="mt-2"
                    >
                        Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-semibold text-amber-600 hover:text-amber-700">
                            Register now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
