// src/app/(app)/membros/editar/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts, mas os tipos vêm de types.ts
import { atualizarMembro, getMembro } from '@/lib/data';
// Importa a interface Membro de types.ts
import { Membro } from '@/lib/types'; // <--- CORREÇÃO AQUI: Importar Membro de types.ts
import { normalizePhoneNumber } from '@/utils/formatters';

// --- REFATORAÇÃO: TOASTS ---
import useToast from '@/hooks/useToast';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/LoadingSpinner'; // Usando o LoadingSpinner principal
// --- FIM REFATORAÇÃO TOASTS ---

// --- NOVO: Ícones para a página (para o layout moderno) ---
import {
    FaUser,
    FaPhone,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaSave,
    FaArrowLeft,
    FaUserTag // Para o status, se for usar ícone
} from 'react-icons/fa';
// --- FIM NOVO: Ícones ---

// CORREÇÃO: Definir FormData diretamente baseada na interface Membro de types.ts
// Omitimos 'id', 'created_at', 'celula_id' e 'celula_nome' porque não são editáveis diretamente aqui
// ou são preenchidos por outras lógicas.
interface MembroEditFormData extends Omit<Membro, 'id' | 'created_at' | 'celula_id' | 'celula_nome'> {}


export default function EditMembroPage() {
    const params = useParams();
    const membroId = params.id as string;
    const [formData, setFormData] = useState<MembroEditFormData>({ // <--- Usar a nova interface
        nome: '',
        telefone: null, // Pode ser null
        data_nascimento: null, // Pode ser null
        endereco: null, // Pode ser null
        data_ingresso: '',
        status: 'Ativo',
    });

    const { toasts, addToast, removeToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const fetchMembro = async () => {
            if (!membroId) return;
            setLoading(true);
            try {
                const membro = await getMembro(membroId);
                if (membro) {
                    setFormData({
                        nome: membro.nome || '',
                        telefone: membro.telefone || null,
                        data_nascimento: membro.data_nascimento || null,
                        endereco: membro.endereco || null,
                        data_ingresso: membro.data_ingresso || '',
                        status: membro.status || 'Ativo', 
                    });
                } else {
                    addToast('Membro não encontrado.', 'error');
                    router.push('/membros');
                }
            } catch (error: any) {
                addToast(`Erro ao carregar membro: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchMembro();
    }, [membroId, router, addToast]); 

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { // Adicionado HTMLTextAreaElement para consistência
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            // Se o campo for de data e o valor for vazio, armazena null.
            // Para outros campos que podem ser null (como 'endereco', 'data_nascimento'),
            // também garante que string vazia vira null.
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Normaliza o telefone novamente antes de enviar
            const normalizedPhone = normalizePhoneNumber(formData.telefone);

            await atualizarMembro(membroId, {
                nome: formData.nome,
                telefone: normalizedPhone || null, // Garante que seja null se vazio
                data_nascimento: formData.data_nascimento,
                endereco: formData.endereco,
                data_ingresso: formData.data_ingresso,
                status: formData.status,
            });
            addToast('Membro atualizado com sucesso!', 'success');
            setTimeout(() => router.push('/membros'), 2000);
        } catch (error: any) {
            addToast(`Erro ao atualizar: ${error.message}`, 'error');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            {/* --- REFATORAÇÃO: TOASTS --- */}
            <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                        duration={toast.duration}
                    />
                ))}
            </div>
            {/* --- FIM REFATORAÇÃO TOASTS --- */}

            <div className="max-w-2xl mx-auto">
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        {/* Header com Gradiente - Inspirado na página de Visitantes */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                        <FaUser className="w-8 h-8" /> {/* Ícone para Editar Membro */}
                                        Editar Membro
                                    </h1>
                                    <p className="text-indigo-100 mt-2">Atualize as informações do membro</p>
                                </div>
                                <Link 
                                    href="/membros"
                                    className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30"
                                >
                                    <FaArrowLeft className="w-4 h-4 mr-2" />
                                    Voltar
                                </Link>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Campo Nome Completo */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUser className="w-4 h-4 text-indigo-500" />
                                        Nome Completo *
                                    </label>
                                    <input 
                                        type="text" 
                                        id="nome" 
                                        name="nome" 
                                        value={formData.nome} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        placeholder="Nome completo do membro"
                                    />
                                </div>

                                {/* Campo Telefone */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaPhone className="w-4 h-4 text-indigo-500" />
                                        Telefone
                                    </label>
                                    <input 
                                        type="text" 
                                        id="telefone" 
                                        name="telefone" 
                                        value={formData.telefone || ''} // Handle null
                                        onChange={handleChange} 
                                        placeholder="(XX) XXXXX-XXXX" 
                                        maxLength={11} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                    />
                                </div>

                                {/* Campo Endereço */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaMapMarkerAlt className="w-4 h-4 text-indigo-500" />
                                        Endereço
                                    </label>
                                    <input 
                                        type="text" 
                                        id="endereco" 
                                        name="endereco" 
                                        value={formData.endereco || ''} // Handle null
                                        onChange={handleChange} 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        placeholder="Endereço completo do membro"
                                    />
                                </div>

                                {/* Datas: Ingresso e Nascimento */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_ingresso" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
                                            Data de Ingresso *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_ingresso" 
                                            name="data_ingresso" 
                                            value={formData.data_ingresso} 
                                            onChange={handleChange} 
                                            required 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
                                            Data de Nascimento
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_nascimento" 
                                            name="data_nascimento" 
                                            value={formData.data_nascimento || ''} // Handle null
                                            onChange={handleChange} 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Campo Status */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaUserTag className="w-4 h-4 text-indigo-500" />
                                        Status *
                                    </label>
                                    <select 
                                        id="status" 
                                        name="status" 
                                        value={formData.status} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                        <option value="Em transição">Em transição</option>
                                    </select>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                                    <Link 
                                        href="/membros" 
                                        className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto"
                                    >
                                        <FaArrowLeft className="w-4 h-4" />
                                        <span>Cancelar</span>
                                    </Link>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Atualizando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="w-4 h-4" />
                                                <span>Atualizar Membro</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}