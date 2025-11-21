// src/components/ui/Toast.tsx
'use client';

import React, { useEffect } from 'react';

// Interface do componente Toast
export interface ToastProps {
    // --- CORREÇÃO APLICADA AQUI ---
    // Removendo 'id' daqui, pois é gerido pelo hook e usado como 'key' pelo React
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

// Componente Toast moderno
const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getStyles = () => {
        const base = "flex items-center p-4 mb-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in";
        switch (type) {
            case 'success':
                return `${base} bg-green-50 border border-green-200 text-green-800`;
            case 'error':
                return `${base} bg-red-50 border border-red-200 text-red-800`;
            case 'warning':
                return `${base} bg-yellow-50 border border-yellow-200 text-yellow-800`;
            case 'info':
                return `${base} bg-blue-50 border border-blue-200 text-blue-800`;
        }
    };

    return (
        <div className={getStyles()}>
            <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-500' : type === 'error' ? 'bg-red-100 text-red-500' : type === 'warning' ? 'bg-yellow-100 text-yellow-500' : 'bg-blue-100 text-blue-500'}`}>
                {getIcon()}
            </div>
            <div className="ml-3 text-sm font-medium">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-gray-100 transition-colors duration-200"
                onClick={onClose}
            >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

export default Toast;