import React from 'react';

export const Badge = ({ children, variant = 'neutral', size = 'sm', className = '' }) => {
    const variants = {
        primary: 'bg-amber-50 text-amber-700 border-amber-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-800 border-amber-300',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
        neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    };

    return (
        <span className={`inline-flex items-center font-medium rounded-full border ${variants[variant] || variants.neutral} ${sizes[size] || sizes.sm} ${className}`}>
            {children}
        </span>
    );
};

export const Alert = ({ children, variant = 'info', className = '' }) => {
    const variants = {
        info: 'bg-sky-50 border-sky-200 text-sky-800',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        danger: 'bg-rose-50 border-rose-200 text-rose-800',
    };

    return (
        <div className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${variants[variant] || variants.info} ${className}`}>
            <div className="flex-1">{children}</div>
        </div>
    );
};

export const Spinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-10 w-10',
    };

    return (
        <svg className={`animate-spin text-amber-600 ${sizes[size] || sizes.md} ${className}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
};
