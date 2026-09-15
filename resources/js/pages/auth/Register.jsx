import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Feedback';
import { ChefHat, Bike, User, ArrowRight } from 'lucide-react';

export const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('customer');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const roles = [
        {
            id: 'customer',
            title: 'Customer',
            desc: 'Order fresh home-cooked meals',
            icon: User,
        },
        {
            id: 'chef',
            title: 'Home Chef',
            desc: 'Sell your kitchen specials (Free trial)',
            icon: ChefHat,
        },
        {
            id: 'rider',
            title: 'Delivery Rider',
            desc: 'Deliver food orders in your area',
            icon: Bike,
        },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== passwordConfirmation) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const user = await register({
                name,
                email,
                phone,
                password,
                password_confirmation: passwordConfirmation,
                role,
            });

            const redirect = (
                user.role === 'chef' ? '/chef/kitchen' :
                user.role === 'rider' ? '/rider/deliveries' : '/'
            );
            navigate(redirect, { replace: true });
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Registration failed.';
            const validationErrors = err.response?.data?.errors;
            if (validationErrors) {
                const firstErr = Object.values(validationErrors).flat()[0];
                setError(firstErr || errorMsg);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto my-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-slate-900">Create Your Account</h1>
                    <p className="text-xs text-slate-500 mt-1">Select how you would like to participate</p>
                </div>

                {/* Role Selector Cards */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                    {roles.map((r) => {
                        const Icon = r.icon;
                        const isSelected = role === r.id;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRole(r.id)}
                                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                                    isSelected
                                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                                    isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold leading-tight">{r.title}</span>
                                <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-tight hidden sm:block">{r.desc}</span>
                            </button>
                        );
                    })}
                </div>

                {error && <Alert variant="danger" className="mb-5">{error}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <Input
                        label="Full Name"
                        type="text"
                        placeholder="e.g. Fatima Ali"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="03001234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        helperText="Required for order updates and verification"
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="Repeat password"
                            value={passwordConfirmation}
                            onChange={(e) => setPasswordConfirmation(e.target.value)}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        className="mt-3"
                    >
                        Register as {roles.find(r => r.id === role)?.title} <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-amber-600 hover:text-amber-700">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
