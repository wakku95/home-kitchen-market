import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert, Badge, Spinner } from '../../components/common/Feedback';
import { ChefHat, CreditCard, Plus, Trash2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export const PaymentMethodsManager = () => {
    const [loading, setLoading] = useState(true);
    const [methods, setMethods] = useState([]);
    const [statusMessage, setStatusMessage] = useState(null);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        method_type: 'jazzcash',
        account_title: '',
        account_number: '',
        bank_name: '',
        instructions: '',
    });

    const allowedMethods = [
        { id: 'jazzcash', name: 'JazzCash Mobile Account' },
        { id: 'easypaisa', name: 'Easypaisa Mobile Account' },
        { id: 'raast', name: 'Raast ID / Instant Pay' },
        { id: 'bank_transfer', name: 'Direct Bank Account / IBAN' },
    ];

    const loadMethods = async () => {
        try {
            setLoading(true);
            const res = await api.get('/chef/payment-methods');
            if (res.data?.success) {
                setMethods(res.data.data);
            }
        } catch (err) {
            setError('Failed to load payment methods.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMethods();
    }, []);

    const handleCreateMethod = async (e) => {
        e.preventDefault();
        setError(null);
        setStatusMessage(null);
        setSaving(true);

        try {
            await api.post('/chef/payment-methods', form);
            setStatusMessage('Payment account added successfully. Ready to receive customer payments.');
            setShowAddModal(false);
            setForm({
                method_type: 'jazzcash',
                account_title: '',
                account_number: '',
                bank_name: '',
                instructions: '',
            });
            loadMethods();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add payment account.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMethod = async (id) => {
        if (!window.confirm('Remove this payment method?')) return;
        try {
            await api.delete(`/chef/payment-methods/${id}`);
            setStatusMessage('Payment account removed.');
            loadMethods();
        } catch (err) {
            setError('Failed to remove payment account.');
        }
    };

    const handleToggleActive = async (id) => {
        try {
            const res = await api.patch(`/chef/payment-methods/${id}/toggle-active`);
            if (res.data?.success) {
                setMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: res.data.data.is_active } : m));
            }
        } catch (err) {
            setError('Failed to toggle status.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Sub-Nav Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Receiving Accounts</h1>
                        <p className="text-xs text-slate-500">Add accounts where customers will transfer food payments directly</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/chef/kitchen"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Kitchen Profile
                    </Link>
                    <Link
                        to="/chef/menu"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Menu Manager
                    </Link>
                    <Link
                        to="/chef/payments"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs"
                    >
                        Payment Accounts
                    </Link>
                </div>
            </div>

            {/* Direct Model Trust Notice */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        100% Direct Customer &rarr; Chef Payment
                    </h3>
                    <p className="text-xs text-amber-900/80 leading-relaxed">
                        When an order is assigned, the customer receives your account details and transfers the food amount directly to your JazzCash, Easypaisa, or Bank. The platform holds zero food funds and charges zero transaction cuts.
                    </p>
                </div>
            </div>

            {statusMessage && <Alert variant="success">{statusMessage}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* List & Add Button */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Configured Accounts ({methods.length})
                </span>
                <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Payment Method
                </Button>
            </div>

            {methods.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">No Payment Accounts Configured</h3>
                    <p className="text-xs text-slate-500">
                        Add at least one payment account (e.g. JazzCash or Easypaisa) so customers can pay you for food orders.
                    </p>
                    <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 mt-2">
                        <Plus className="w-3.5 h-3.5" /> Add First Account
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {methods.map((m) => (
                        <div key={m.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                        {m.method_type.replace('_', ' ')}
                                    </span>
                                    <h3 className="font-bold text-sm text-slate-900 mt-1">{m.account_title}</h3>
                                </div>
                                <Badge variant={m.verification_status === 'verified' ? 'success' : 'warning'} size="sm">
                                    {m.verification_status === 'verified' ? 'Verified' : 'Pending Review'}
                                </Badge>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                    Account / Mobile Number
                                </span>
                                <span className="font-mono font-bold text-sm text-slate-800 tracking-wide select-all">
                                    {m.account_number}
                                </span>
                                {m.bank_name && (
                                    <span className="text-xs text-slate-600 block mt-1 font-medium">
                                        Bank: {m.bank_name}
                                    </span>
                                )}
                            </div>

                            {m.instructions && (
                                <p className="text-xs text-slate-500 italic">Note: "{m.instructions}"</p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => handleToggleActive(m.id)}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                                        m.is_active ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                                    }`}
                                >
                                    {m.is_active ? '● Active for Orders' : '○ Inactive'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteMethod(m.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                    title="Delete Account"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Payment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
                        <h3 className="text-base font-bold text-slate-900">Add Payment Destination</h3>
                        <form onSubmit={handleCreateMethod} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Payment Method
                                </label>
                                <select
                                    value={form.method_type}
                                    onChange={(e) => setForm({ ...form, method_type: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                >
                                    {allowedMethods.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Account Title (Beneficiary Name)"
                                value={form.account_title}
                                onChange={(e) => setForm({ ...form, account_title: e.target.value })}
                                placeholder="e.g. Fatima Tariq"
                                required
                            />

                            <Input
                                label="Account Number / Phone / IBAN"
                                value={form.account_number}
                                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                                placeholder="03001234567 or PK12MEZN..."
                                required
                            />

                            {form.method_type === 'bank_transfer' && (
                                <Input
                                    label="Bank Name"
                                    value={form.bank_name}
                                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                                    placeholder="e.g. Meezan Bank, HBL, Allied Bank"
                                    required
                                />
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Special Payment Instructions (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.instructions}
                                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                                    placeholder="e.g. Please send screenshot on WhatsApp after transferring"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm" loading={saving}>
                                    Save Destination
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
