// src/utils/formatters.ts
// Este arquivo contém funções de formatação que podem ser usadas tanto no cliente quanto no servidor.
// Ele NÃO deve ter 'use client' ou 'use server' no seu topo.

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importar o locale ptBR para formatação de datas

// --- Funções de Formatação para Frontend (TypeScript) ---

export function formatPhoneNumberDisplay(numberStr: string | null | undefined): string {
    if (!numberStr) return "N/A";
    // Remove caracteres não numéricos.
    const digits = numberStr.replace(/\D/g, '');

    if (digits.length === 11) { // Ex: (XX) 9XXXX-XXXX
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
    }
    if (digits.length === 10) { // Ex: (XX) XXXX-XXXX
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6, 10)}`;
    }
    // Retorna a string original se não corresponder aos padrões esperados.
    return numberStr;
}

export function formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    try {
        // `parseISO` é robusto para strings de data, incluindo 'YYYY-MM-DD' e ISO com timezone.
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) { // Verifica se a data é inválida
            return dateStr; // Retorna a string original se a data for inválida
        }
        return format(d, 'dd/MM/yyyy', { locale: ptBR }); // Formata para DD/MM/YYYY com locale pt-BR
    } catch {
        return dateStr; // Em caso de erro de parsing, retorna a string original
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

// Função para formatar uma data para exibição apenas do mês e ano (Ex: Out 23)
export function formatMonthYearDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return "N/A";
    try {
        const d = parseISO(dateStr);
        if (isNaN(d.getTime())) {
            return dateStr;
        }
        return format(d, 'MMM yy', { locale: ptBR }); // Ex: Out 23
    } catch {
        return dateStr;
    }
}

// FUNÇÃO CENTRALIZADA PARA NORMALIZAR NÚMEROS DE TELEFONE
export function normalizePhoneNumber(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/\D/g, ''); // Remove tudo que não é dígito
}