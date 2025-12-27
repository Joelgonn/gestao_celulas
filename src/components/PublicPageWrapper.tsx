'use client'; // Deve ser a primeira linha

import { useState } from 'react';
import Link from 'next/link';
import { FaCheckCircle } from 'react-icons/fa';
import PublicRegistrationForm from '@/components/PublicRegistrationForm';

// Tela de Sucesso interna
const SuccessScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500 text-4xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Inscrição Confirmada!</h1>
            <p className="text-gray-600">
                Seus dados foram enviados com sucesso. Procure o líder da célula ou a organização do evento para confirmar seu pagamento.
            </p>
            <div className="pt-4">
                <Link href="/" className="text-purple-600 font-bold hover:underline">Voltar ao início</Link>
            </div>
        </div>
    </div>
);

export default function PublicPageWrapper({ token, eventoTipo }: { token: string, eventoTipo: any }) {
    const [success, setSuccess] = useState(false);

    if (success) {
        return <SuccessScreen />;
    }

    return <PublicRegistrationForm token={token} eventoTipo={eventoTipo} onSuccess={() => setSuccess(true)} />;
}