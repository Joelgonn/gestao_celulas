// src/app/(app)/membros/editar/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Importa funções de data.ts, mas os tipos vêm de types.ts
import { atualizarMembro, getMembro } from '@/lib/data';
// Importa a interface Membro de types.ts
import { Membro, MembroEditFormData } from '@/lib/types'; 
import { normalizePhoneNumber } from '@/utils/formatters';

import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

// --- Ícones para a página (para o layout moderno) ---
import {
    FaUser,
    FaPhone,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaSave,
    FaArrowLeft,
    FaUserTag,
    FaChevronDown, // Adicionado para o CustomSelectSheet
    FaSearch,      // Adicionado para o CustomSelectSheet
    FaTimes        // Adicionado para o CustomSelectSheet
} from 'react-icons/fa';
// --- FIM NOVO: Ícones ---


// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
// Reutilizado e adaptado para a lista de status
interface CustomSelectSheetProps {
    label: string;
    value: string; // O status não pode ser null, é sempre uma string
    onChange: (value: string) => void;
    options: { id: string; nome: string }[]; // Para o status, id e nome serão iguais
    icon: React.ReactNode;
    placeholder?: string;
}

const CustomSelectSheet = ({ 
    label, 
    value, 
    onChange, 
    options, 
    icon, 
    placeholder = "Selecione..."
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Mantido para possível futura expansão
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || null;

    const filteredOptions = options.filter(option => 
        option.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                {icon} {label}
            </label>
            
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-left"
            >
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedName || placeholder}
                </span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div 
                        ref={modalRef}
                        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300"
                    >
                        {/* Header do Modal */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Barra de Busca (opcional para status, mas mantida para consistência) */}
                        {/* <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div> */}

                        {/* Lista de Opções */}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = value === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => handleSelect(option.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{option.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-indigo-500 text-lg" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum item encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
// --- FIM COMPONENTE CUSTOMIZADO ---


export default function EditMembroPage() {
    const params = useParams();
    const membroId = params.id as string;
    const [formData, setFormData] = useState<MembroEditFormData>({
        nome: '',
        telefone: '',
        data_nascimento: null,
        endereco: null,
        data_ingresso: '',
        status: 'Ativo', 
        // cargo e email não estão no MembroEditFormData, mas se fossem ser adicionados, seriam aqui:
        // cargo: '', 
        // email: '' 
    });

    const { addToast, ToastContainer } = useToast();

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
                        telefone: membro.telefone || '',
                        data_nascimento: membro.data_nascimento || null,
                        endereco: membro.endereco || null,
                        data_ingresso: membro.data_ingresso || '',
                        status: membro.status || 'Ativo', 
                        // cargo: (membro as any).cargo || '', 
                        // email: (membro as any).email || '' 
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

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: normalizePhoneNumber(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
        }
    }, []);

    // Handler específico para o CustomSelectSheet
    const handleSelectChange = useCallback((name: 'status', value: string) => { // 'name' é 'status' aqui
        setFormData(prev => ({ ...prev, [name]: value as Membro['status'] }));
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const normalizedPhone = normalizePhoneNumber(formData.telefone);

            await atualizarMembro(membroId, {
                nome: formData.nome,
                telefone: normalizedPhone || null,
                data_nascimento: formData.data_nascimento || null,
                endereco: formData.endereco || null,
                data_ingresso: formData.data_ingresso,
                status: formData.status,
            });
            addToast('Membro atualizado com sucesso!', 'success');
            setTimeout(() => router.push('/membros'), 1500); // Reduzido o tempo para 1.5s
        } catch (error: any) {
            addToast(`Erro ao atualizar: ${error.message}`, 'error');
            setSubmitting(false);
        }
    };

    // Opções para o CustomSelectSheet de Status
    const statusOptions = [
        { id: 'Ativo', nome: 'Ativo' },
        { id: 'Inativo', nome: 'Inativo' },
        { id: 'Em transição', nome: 'Em transição' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                {loading ? (
                    <div className="text-center py-16">
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando dados...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* Header com Gradiente */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 sm:px-6 sm:py-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                        <FaUser className="w-6 h-6 sm:w-8 sm:h-8" />
                                        Editar Membro
                                    </h1>
                                    <p className="text-indigo-100 mt-1 text-sm sm:text-base">
                                        Atualize as informações do membro
                                    </p>
                                </div>
                                <Link 
                                    href="/membros"
                                    className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                                >
                                    <FaArrowLeft className="w-3 h-3 mr-2" />
                                    Voltar
                                </Link>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="p-4 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                {/* Campo Nome Completo */}
                                <div className="space-y-1">
                                    <label htmlFor="nome" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <FaUser className="text-indigo-500" />
                                        Nome Completo *
                                    </label>
                                    <input 
                                        type="text" 
                                        id="nome" 
                                        name="nome" 
                                        value={formData.nome} 
                                        onChange={handleChange} 
                                        required 
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400"
                                        placeholder="Nome completo do membro"
                                    />
                                </div>

                                {/* Campo Telefone */}
                                <div className="space-y-1">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaPhone className="text-indigo-500" />
                                        Telefone
                                    </label>
                                    <input 
                                        type="text" 
                                        id="telefone" 
                                        name="telefone" 
                                        value={formData.telefone || ''}
                                        onChange={handleChange} 
                                        placeholder="(XX) XXXXX-XXXX" 
                                        maxLength={11} 
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400"
                                    />
                                </div>

                                {/* Campo Endereço */}
                                <div className="space-y-1">
                                    <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-indigo-500" />
                                        Endereço
                                    </label>
                                    <input 
                                        type="text" 
                                        id="endereco" 
                                        name="endereco" 
                                        value={formData.endereco || ''}
                                        onChange={handleChange} 
                                        className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400"
                                        placeholder="Endereço completo do membro"
                                    />
                                </div>

                                {/* Datas: Ingresso e Nascimento */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1">
                                        <label htmlFor="data_ingresso" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="text-indigo-500" />
                                            Data de Ingresso *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_ingresso" 
                                            name="data_ingresso" 
                                            value={formData.data_ingresso} 
                                            onChange={handleChange} 
                                            required 
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FaCalendarAlt className="text-indigo-500" />
                                            Data de Nascimento
                                        </label>
                                        <input 
                                            type="date" 
                                            id="data_nascimento" 
                                            name="data_nascimento" 
                                            value={formData.data_nascimento || ''}
                                            onChange={handleChange} 
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Campo Status - Usando CustomSelectSheet */}
                                <CustomSelectSheet
                                    label="Status *"
                                    icon={<FaUserTag className="text-indigo-500" />}
                                    value={formData.status}
                                    onChange={(val) => handleSelectChange('status', val)}
                                    options={statusOptions}
                                    placeholder="Selecione o status"
                                />

                                {/* Botões de Ação */}
                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-200">
                                    <Link 
                                        href="/membros" 
                                        className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto text-base"
                                    >
                                        <FaArrowLeft />
                                        <span>Cancelar</span>
                                    </Link>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto text-base"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Atualizando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave />
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