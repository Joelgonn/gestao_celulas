'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adicionarMembro, listarCelulasParaAdmin } from '@/lib/data';
import { Membro, CelulaOption } from '@/lib/types';
import { normalizePhoneNumber } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

import {
    FaUserPlus, FaPhone, FaCalendarAlt, FaMapMarkerAlt, FaComments, FaArrowLeft,
    FaSave, FaUserTag, FaChevronDown, FaCheckCircle, FaTimes, FaSearch, FaSearchLocation,
    FaSpinner
} from 'react-icons/fa';

// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
interface CustomSelectSheetProps {
    label: string; value: string; onChange: (value: string) => void; options: { id: string; nome: string }[];
    icon: React.ReactNode; placeholder?: string; searchable?: boolean;
}
const CustomSelectSheet = ({ label, value, onChange, options, icon, placeholder = "Selecione...", searchable = false }: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const selectedName = options.find(o => o.id === value)?.nome || null;
    const filteredOptions = options.filter(option => option.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(event.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'; else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSelect = (id: string) => { onChange(id); setIsOpen(false); setSearchTerm(''); };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">{icon} {label}</label>
            <button type="button" onClick={() => setIsOpen(true)} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-left">
                <span className={`text-base truncate ${selectedName ? 'text-gray-900' : 'text-gray-400'}`}>{selectedName || placeholder}</span>
                <FaChevronDown className="text-gray-400 text-xs ml-2" />
            </button>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors"><FaTimes /></button>
                        </div>
                        {searchable && (
                            <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                    <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredOptions.length > 0 ? (filteredOptions.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button key={option.id} type="button" onClick={() => handleSelect(option.id)} className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                        <span className="text-base">{option.nome}</span>
                                        {isSelected && <FaCheckCircle className="text-indigo-500 text-lg" />}
                                    </button>
                                );
                            })) : (<div className="text-center py-8 text-gray-500">Nenhum item encontrado.</div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface FormData {
    nome: string; telefone: string | null; data_ingresso: string; data_nascimento: string | null; endereco: string | null; status: Membro['status']; celula_id: string;
}

export default function NewMembroPage() {
    const [formData, setFormData] = useState<FormData>({
        nome: '', telefone: null, data_ingresso: new Date().toISOString().split('T')[0], data_nascimento: null, endereco: null, status: 'Ativo', celula_id: '',
    });
    
    // Estados do CEP
    const [cepInput, setCepInput] = useState('');
    const [cepLoading, setCepLoading] = useState(false);

    const [celulasOptions, setCelulasOptions] = useState<CelulaOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { addToast, ToastContainer } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchDependencies = async () => {
            setLoading(true);
            try {
                const cells = await listarCelulasParaAdmin();
                setCelulasOptions(cells);
                if (cells.length === 1) setFormData(prev => ({ ...prev, celula_id: cells[0].id }));
            } catch (e: any) { addToast(e.message || 'Erro ao carregar dados iniciais', 'error'); } finally { setLoading(false); }
        };
        fetchDependencies();
    }, [addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'telefone' ? normalizePhoneNumber(value) : (value === '' ? null : value) }));
    }, []);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // --- LÓGICA DE CEP ---
    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 8) val = val.slice(0, 8);
        if (val.length > 5) val = val.replace(/^(\d{5})(\d)/, '$1-$2');
        setCepInput(val);
    };

    const handleCepBlur = async () => {
        const cleanCep = cepInput.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            setCepLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    // Constrói o endereço completo
                    const fullAddress = `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`;
                    setFormData(prev => ({ ...prev, endereco: fullAddress }));
                    // Opcional: Focar no campo de endereço para digitar o número (teria que usar useRef no input)
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            } finally {
                setCepLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        if (!formData.nome.trim()) { addToast('Nome Completo é obrigatório.', 'error'); setSubmitting(false); return; }
        if (!formData.data_ingresso.trim()) { addToast('Data de Ingresso é obrigatória.', 'error'); setSubmitting(false); return; }
        if (!formData.celula_id) { addToast('Célula é obrigatória.', 'error'); setSubmitting(false); return; }

        try {
            await adicionarMembro({
                nome: formData.nome.trim(), telefone: formData.telefone, data_ingresso: formData.data_ingresso, data_nascimento: formData.data_nascimento, endereco: formData.endereco, status: formData.status, celula_id: formData.celula_id,
            });
            addToast('Membro adicionado com sucesso!', 'success', 3000);
            setTimeout(() => router.push('/membros'), 1500);
        } catch (error: any) { addToast(`Falha ao adicionar: ${error.message}`, 'error'); } finally { setSubmitting(false); }
    };

    const statusOptions = [{ id: 'Ativo', nome: 'Ativo' }, { id: 'Inativo', nome: 'Inativo' }, { id: 'Em transição', nome: 'Em transição' }];

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />
            <div className="max-w-2xl mx-auto mt-4 sm:mt-0">
                {loading ? (
                    <div className="text-center py-16"><LoadingSpinner /><p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando...</p></div>
                ) : (
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-6 sm:px-6 sm:py-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div><h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3"><FaUserPlus className="w-6 h-6 sm:w-8 sm:h-8" /> Novo Membro</h1><p className="text-indigo-100 mt-1 text-sm sm:text-base">Adicionar novo membro à célula</p></div>
                                <Link href="/membros" className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"><FaArrowLeft className="w-3 h-3 mr-2" /> Voltar</Link>
                            </div>
                        </div>
                        <div className="p-4 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                <div className="space-y-1">
                                    <label htmlFor="nome" className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FaUserPlus className="text-indigo-500" /> Nome Completo *</label>
                                    <input id="nome" name="nome" type="text" required value={formData.nome} onChange={handleChange} className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400" placeholder="Ex: João da Silva" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="telefone" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaPhone className="text-indigo-500" /> Telefone</label>
                                    <input id="telefone" name="telefone" type="tel" value={formData.telefone || ''} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" maxLength={11} className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400" />
                                </div>

                                {/* BLOCO DE ENDEREÇO COM CEP */}
                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                    <div className="space-y-1 relative">
                                        <label htmlFor="cep" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaSearchLocation className="text-indigo-500" /> CEP (Busca Automática)</label>
                                        <input 
                                            id="cep" name="cep" type="tel" value={cepInput} onChange={handleCepChange} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} 
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400" 
                                        />
                                        {cepLoading && <div className="absolute right-3 top-10"><FaSpinner className="animate-spin text-indigo-500" /></div>}
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="endereco" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaMapMarkerAlt className="text-indigo-500" /> Endereço Completo</label>
                                        <input id="endereco" name="endereco" type="text" value={formData.endereco || ''} onChange={handleChange} className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none placeholder:text-gray-400" placeholder="Rua, Número, Bairro, Cidade" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1">
                                        <label htmlFor="data_ingresso" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaCalendarAlt className="text-indigo-500" /> Data de Ingresso *</label>
                                        <input id="data_ingresso" name="data_ingresso" type="date" required value={formData.data_ingresso} onChange={handleChange} className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="data_nascimento" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaCalendarAlt className="text-indigo-500" /> Data de Nascimento</label>
                                        <input id="data_nascimento" name="data_nascimento" type="date" value={formData.data_nascimento || ''} onChange={handleChange} className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none" />
                                    </div>
                                </div>
                                <CustomSelectSheet label="Status *" icon={<FaUserTag className="text-indigo-500" />} value={formData.status} onChange={(val) => handleSelectChange('status', val)} options={statusOptions} />
                                {celulasOptions.length > 1 && <CustomSelectSheet label="Célula *" icon={<FaComments className="text-indigo-500" />} value={formData.celula_id} onChange={(val) => handleSelectChange('celula_id', val)} options={celulasOptions} placeholder="Selecione a Célula" searchable={true} />}
                                {celulasOptions.length === 1 && <input type="hidden" name="celula_id" value={formData.celula_id} />}
                                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t border-gray-200">
                                    <Link href="/membros" className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium w-full sm:w-auto text-base"><FaArrowLeft /><span>Cancelar</span></Link>
                                    <button type="submit" disabled={submitting} className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl w-full sm:w-auto text-base">{submitting ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Adicionando...</span></> : <><FaSave /><span>Salvar Membro</span></>}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}