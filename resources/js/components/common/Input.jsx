import React from 'react';

export const Input = ({
    label,
    error,
    type = 'text',
    className = '',
    helperText,
    id,
    ...props
}) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                type={type}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                    error
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-amber-500 focus:ring-amber-100'
                } ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
            {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};
