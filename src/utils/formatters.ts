// src/utils/formatters.ts
// Este arquivo contém funções de formatação que podem ser usadas tanto no cliente quanto no servidor.
// Ele NÃO deve ter 'use client' ou 'use server' no seu topo.

import { format, parseISO } from 'date-fns';

export function formatPhoneNumberDisplay(numberStr: string | null | undefined): string {
    if (!numberStr) return "N/A";
    const digits = numberStr.replace(/\D/g, '');
    if (digits.length === 11) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
    }
    if (digits.length === 10) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6, 10)}`;
    }
    return numberStr;
}

export function formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    try {
        // parseISO é mais robusto para strings de data, incluindo 'YYYY-MM-DD' e ISO com timezone
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) { // Verifica se a data é inválida
            return dateStr;
        }
        return format(d, 'dd/MM/yyyy'); // Formata para DD/MM/YYYY
    } catch {
        return dateStr;
    }
}

export function formatDateForInput(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) {
            return '';
        }
        return format(d, 'yyyy-MM-dd'); // Formata para YYYY-MM-DD para input[type="date"]
    } catch {
        return '';
    }
}

// FUNÇÃO MOVIDA PARA CÁ PARA CENTRALIZAÇÃO
export function normalizePhoneNumber(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/\D/g, ''); // Remove tudo que não é dígito
}