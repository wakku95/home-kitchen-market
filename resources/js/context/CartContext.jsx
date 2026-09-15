import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [kitchen, setKitchen] = useState(() => {
        const saved = localStorage.getItem('hk_cart_kitchen');
        return saved ? JSON.parse(saved) : null;
    });

    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('hk_cart_items');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (kitchen) {
            localStorage.setItem('hk_cart_kitchen', JSON.stringify(kitchen));
        } else {
            localStorage.removeItem('hk_cart_kitchen');
        }

        if (items.length > 0) {
            localStorage.setItem('hk_cart_items', JSON.stringify(items));
        } else {
            localStorage.removeItem('hk_cart_items');
        }
    }, [kitchen, items]);

    const addItem = (currentKitchen, menuItem, quantity = 1) => {
        // Enforce strict single-kitchen cart rule
        if (kitchen && kitchen.id !== currentKitchen.id) {
            const confirmChange = window.confirm(
                `Your cart already contains dishes from "${kitchen.name}".\n\nStarting a new order with "${currentKitchen.name}" will clear your previous cart. Continue?`
            );
            if (!confirmChange) {
                return false;
            }
            setKitchen(currentKitchen);
            setItems([{ ...menuItem, quantity }]);
            return true;
        }

        if (!kitchen) {
            setKitchen(currentKitchen);
        }

        setItems(prevItems => {
            const existingIndex = prevItems.findIndex(i => i.id === menuItem.id);
            if (existingIndex > -1) {
                const updated = [...prevItems];
                updated[existingIndex].quantity += quantity;
                return updated;
            }
            return [...prevItems, { ...menuItem, quantity }];
        });

        return true;
    };

    const updateQuantity = (menuItemId, quantity) => {
        if (quantity <= 0) {
            removeItem(menuItemId);
            return;
        }
        setItems(prevItems =>
            prevItems.map(item => item.id === menuItemId ? { ...item, quantity } : item)
        );
    };

    const removeItem = (menuItemId) => {
        setItems(prevItems => {
            const updated = prevItems.filter(item => item.id !== menuItemId);
            if (updated.length === 0) {
                setKitchen(null);
            }
            return updated;
        });
    };

    const clearCart = () => {
        setKitchen(null);
        setItems([]);
        localStorage.removeItem('hk_cart_kitchen');
        localStorage.removeItem('hk_cart_items');
    };

    const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

    return (
        <CartContext.Provider
            value={{
                kitchen,
                items,
                totalCount,
                subtotal,
                addItem,
                updateQuantity,
                removeItem,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
