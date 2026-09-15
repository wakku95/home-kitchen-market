import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert, Badge, Spinner } from '../../components/common/Feedback';
import { ChefHat, Plus, Edit2, Trash2, Clock, Check, X, Layers } from 'lucide-react';

export const MenuManager = () => {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [statusMessage, setStatusMessage] = useState(null);
    const [error, setError] = useState(null);

    // Modals state
    const [showCatModal, setShowCatModal] = useState(false);
    const [catName, setCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState(null);

    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [itemForm, setItemForm] = useState({
        menu_category_id: '',
        name: '',
        description: '',
        price: '',
        preparation_time_minutes: '15',
        is_available: true,
    });

    const loadMenu = async () => {
        try {
            setLoading(true);
            const [catRes, itemRes] = await Promise.all([
                api.get('/chef/menu/categories'),
                api.get('/chef/menu/items'),
            ]);
            if (catRes.data?.success) setCategories(catRes.data.data);
            if (itemRes.data?.success) setItems(itemRes.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load menu. Make sure your kitchen is created.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMenu();
    }, []);

    // Category Handlers
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        try {
            if (editingCatId) {
                await api.put(`/chef/menu/categories/${editingCatId}`, { name: catName });
                setStatusMessage('Category updated.');
            } else {
                await api.post('/chef/menu/categories', { name: catName });
                setStatusMessage('Category created.');
            }
            setShowCatModal(false);
            setCatName('');
            setEditingCatId(null);
            loadMenu();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save category.');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Delete this category? Items in this category will remain unassigned.')) return;
        try {
            await api.delete(`/chef/menu/categories/${id}`);
            setStatusMessage('Category deleted.');
            loadMenu();
        } catch (err) {
            setError('Failed to delete category.');
        }
    };

    // Item Handlers
    const handleOpenCreateItem = () => {
        setEditingItemId(null);
        setItemForm({
            menu_category_id: categories.length > 0 ? categories[0].id : '',
            name: '',
            description: '',
            price: '',
            preparation_time_minutes: '15',
            is_available: true,
        });
        setShowItemModal(true);
    };

    const handleOpenEditItem = (item) => {
        setEditingItemId(item.id);
        setItemForm({
            menu_category_id: item.menu_category_id || '',
            name: item.name,
            description: item.description || '',
            price: item.price,
            preparation_time_minutes: item.preparation_time_minutes || '15',
            is_available: item.is_available,
        });
        setShowItemModal(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        try {
            if (editingItemId) {
                await api.put(`/chef/menu/items/${editingItemId}`, itemForm);
                setStatusMessage('Menu item updated.');
            } else {
                await api.post('/chef/menu/items', itemForm);
                setStatusMessage('Menu item added.');
            }
            setShowItemModal(false);
            loadMenu();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save menu item.');
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Delete this menu item?')) return;
        try {
            await api.delete(`/chef/menu/items/${id}`);
            setStatusMessage('Menu item removed.');
            loadMenu();
        } catch (err) {
            setError('Failed to delete menu item.');
        }
    };

    const handleToggleAvailability = async (id) => {
        try {
            const res = await api.patch(`/chef/menu/items/${id}/availability`);
            if (res.data?.success) {
                setItems(prev => prev.map(item => item.id === id ? { ...item, is_available: res.data.data.is_available } : item));
            }
        } catch (err) {
            setError('Failed to update availability.');
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
                        <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Menu Manager</h1>
                        <p className="text-xs text-slate-500">Organize dishes by categories and set availability</p>
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
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white shadow-xs"
                    >
                        Menu Manager
                    </Link>
                    <Link
                        to="/chef/payments"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Payment Accounts
                    </Link>
                </div>
            </div>

            {statusMessage && <Alert variant="success">{statusMessage}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800">
                        {categories.length} Categories &bull; {items.length} Menu Items
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditingCatId(null);
                            setCatName('');
                            setShowCatModal(true);
                        }}
                        className="gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-amber-600" /> Add Category
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleOpenCreateItem}
                        className="gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-white" /> Add Menu Item
                    </Button>
                </div>
            </div>

            {/* Categories & Items List */}
            {categories.length === 0 && items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Your Menu is Empty</h3>
                    <p className="text-xs text-slate-500">
                        Start by creating categories (e.g. Biryani, BBQ, Desserts) and adding your daily home-cooked specials.
                    </p>
                    <Button variant="primary" size="sm" onClick={handleOpenCreateItem} className="gap-1.5 mt-2">
                        <Plus className="w-3.5 h-3.5" /> Add First Dish
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Render by Category */}
                    {categories.map((cat) => {
                        const categoryItems = items.filter(i => i.menu_category_id === cat.id);
                        return (
                            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                                <div className="bg-slate-50/70 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                                        <Badge variant="neutral" size="sm">{categoryItems.length} items</Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => {
                                                setEditingCatId(cat.id);
                                                setCatName(cat.name);
                                                setShowCatModal(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                                            title="Edit Category"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                                            title="Delete Category"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {categoryItems.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No items in this category yet.
                                        </div>
                                    ) : (
                                        categoryItems.map((item) => (
                                            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                                                        <Badge variant={item.is_available ? 'success' : 'danger'} size="sm">
                                                            {item.is_available ? 'Available' : 'Sold Out'}
                                                        </Badge>
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                                                        <span className="font-extrabold text-amber-700 text-sm">
                                                            Rs. {Number(item.price).toLocaleString()}
                                                        </span>
                                                        <span>&bull;</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-slate-400" /> ~{item.preparation_time_minutes} min prep
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    {/* Fast Availability Switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAvailability(item.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                                            item.is_available
                                                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        {item.is_available ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                                        {item.is_available ? 'Mark Sold Out' : 'Mark Available'}
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenEditItem(item)}
                                                        className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Uncategorized Items */}
                    {items.filter(i => !i.menu_category_id).length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                            <div className="bg-slate-50/70 px-5 py-3 border-b border-slate-200">
                                <span className="font-bold text-sm text-slate-800">Other Specials</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {items.filter(i => !i.menu_category_id).map((item) => (
                                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-900">{item.name}</span>
                                                <Badge variant={item.is_available ? 'success' : 'danger'} size="sm">
                                                    {item.is_available ? 'Available' : 'Sold Out'}
                                                </Badge>
                                            </div>
                                            <span className="font-extrabold text-amber-700 text-sm">
                                                Rs. {Number(item.price).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAvailability(item.id)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 transition"
                                            >
                                                Toggle Availability
                                            </button>
                                            <button onClick={() => handleOpenEditItem(item)} className="p-2 text-slate-500 hover:text-slate-800">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Category Modal */}
            {showCatModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
                        <h3 className="text-base font-bold text-slate-900">
                            {editingCatId ? 'Edit Category' : 'Create Category'}
                        </h3>
                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <Input
                                label="Category Name"
                                value={catName}
                                onChange={(e) => setCatName(e.target.value)}
                                placeholder="e.g. Biryani Specials"
                                required
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" size="sm" onClick={() => setShowCatModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm">
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Menu Item Modal */}
            {showItemModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 my-8">
                        <h3 className="text-base font-bold text-slate-900">
                            {editingItemId ? 'Edit Menu Item' : 'Add New Menu Item'}
                        </h3>
                        <form onSubmit={handleSaveItem} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Category
                                </label>
                                <select
                                    value={itemForm.menu_category_id}
                                    onChange={(e) => setItemForm({ ...itemForm, menu_category_id: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                >
                                    <option value="">-- No Category --</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Dish Name"
                                value={itemForm.name}
                                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                placeholder="e.g. Chicken Degi Biryani"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Price (PKR)"
                                    type="number"
                                    min="1"
                                    value={itemForm.price}
                                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                    placeholder="450"
                                    required
                                />
                                <Input
                                    label="Prep Time (Min)"
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={itemForm.preparation_time_minutes}
                                    onChange={(e) => setItemForm({ ...itemForm, preparation_time_minutes: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Description & Portion Size
                                </label>
                                <textarea
                                    rows={2}
                                    value={itemForm.description}
                                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                    placeholder="e.g. Single plate with 1 chicken piece, potato, raita & salad"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_available_checkbox"
                                    checked={itemForm.is_available}
                                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                                    className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                                />
                                <label htmlFor="is_available_checkbox" className="text-xs font-bold text-slate-800">
                                    Available to order immediately
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button variant="secondary" size="sm" onClick={() => setShowItemModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm">
                                    {editingItemId ? 'Update Dish' : 'Add Dish'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
