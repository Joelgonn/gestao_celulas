// src/app/(app)/reunioes/editar/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    FaCalendarAlt, 
    FaUser,     
    FaArrowLeft,
    FaChild,
    FaFilePdf,
    FaUpload,
    FaSave,   
    FaBookOpen,
    FaChevronDown,
    FaSearch,
    FaTimes,
    FaCheckCircle,
    FaSpinner,
    FaCloudUploadAlt,
    FaPen
} from 'react-icons/fa';

import {
    getReuniao,
    atualizarReuniao,
    listarMembros,
    verificarDuplicidadeReuniao,
    uploadMaterialReuniao,
} from '@/lib/data';

import { Membro, ReuniaoFormData } from '@/lib/types';
import { formatDateForInput } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

// --- COMPONENTES VISUAIS AUXILIARES ---

const InputField = ({ label, name, value, onChange, type = 'text', required = false, icon: Icon, placeholder, disabled }: any) => (
    <div className="space-y-1">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />}
            <input 
                type={type} 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                required={required} 
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full ${Icon ? 'pl-11' : 'pl-5'} pr-5 py-4 text-sm font-bold text-gray-700 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all border-gray-100 focus:border-emerald-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
            />
        </div>
    </div>
);

// --- COMPONENTE CUSTOM SELECT (REESTILIZADO) ---
interface CustomSelectSheetProps {
    label: string;
    value: string | null;
    onChange: (value: string | null) => void;
    options: Membro[];
    icon: React.ReactNode;
    placeholder?: string;
    allowNone?: boolean;
}

const CustomSelectSheet = ({ 
    label, 
    value, 
    onChange, 
    options, 
    icon, 
    placeholder = "Selecione...",
    allowNone = false
}: CustomSelectSheetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    const selectedName = options.find(o => o.id === value)?.nome || (value ? "Item não encontrado" : null);
    const filteredOptions = options.filter(option => option.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (modalRef.current && !modalRef.current.contains(e.target as Node)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    return (
        <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-4 border-2 rounded-2xl flex items-center justify-between bg-gray-50 transition-all hover:border-emerald-200 border-gray-100 group"
            >
                <div className="flex items-center gap-3 truncate">
                    <span className="text-gray-400 group-hover:text-emerald-500 transition-colors">{icon}</span>
                    <span className={`text-sm font-bold truncate ${selectedName ? 'text-gray-700' : 'text-gray-400'}`}>
                        {selectedName || placeholder}
                    </span>
                </div>
                <FaChevronDown className="text-gray-300 text-xs ml-2" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
                    <div ref={modalRef} className="w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-3 bg-gray-200 text-gray-600 rounded-2xl active:scale-90"><FaTimes /></button>
                        </div>
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Buscar..." autoFocus className="w-full pl-11 pr-4 py-4 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 pb-10 sm:pb-4">
                            {allowNone && (
                                <button type="button" onClick={() => { onChange(null); setIsOpen(false); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${!value ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-bold">Nenhum / Remover</span>
                                    {!value && <FaCheckCircle className="text-white" />}
                                </button>
                            )}
                            {filteredOptions.map((option) => (
                                <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all ${value === option.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-bold truncate">{option.nome}</span>
                                    {value === option.id && <FaCheckCircle className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PÁGINA PRINCIPAL ---

export default function EditReuniaoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;
    const router = useRouter();
    const { addToast, ToastContainer } = useToast();

    const [formData, setFormData] = useState<ReuniaoFormData>({
        data_reuniao: '',
        tema: '',
        ministrador_principal: null,
        ministrador_secundario: null,
        responsavel_kids: null,
        caminho_pdf: null,
    });
    const [membros, setMembros] = useState<Membro[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [membrosData, reuniaoDataFromLib] = await Promise.all([
                    listarMembros(),
                    getReuniao(reuniaoId),
                ]);

                setMembros(membrosData);

                if (!reuniaoDataFromLib) {
                    addToast('Reunião não encontrada', 'error');
                    setTimeout(() => router.replace('/reunioes'), 2000);
                    return;
                }

                setFormData({
                    data_reuniao: formatDateForInput(reuniaoDataFromLib.data_reuniao),
                    tema: reuniaoDataFromLib.tema || '',
                    ministrador_principal: reuniaoDataFromLib.ministrador_principal || null,
                    ministrador_secundario: reuniaoDataFromLib.ministrador_secundario || null,
                    responsavel_kids: reuniaoDataFromLib.responsavel_kids || null,
                    caminho_pdf: reuniaoDataFromLib.caminho_pdf || null,
                    celula_id: reuniaoDataFromLib.celula_id,
                });
            } catch (e: any) {
                addToast(e.message || 'Erro ao carregar dados', 'error');
                setTimeout(() => router.replace('/reunioes'), 2000);
            } finally {
                setLoading(false);
            }
        };
        if (reuniaoId) fetchData();
    }, [reuniaoId, router, addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    }, []);

    const handleSelectChange = useCallback((name: string, value: string | null) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!formData.tema.trim() || !formData.ministrador_principal || !formData.data_reuniao) {
            addToast('Preencha os campos obrigatórios', 'error');
            setSubmitting(false);
            return;
        }

        try {
            const isDuplicate = await verificarDuplicidadeReuniao(formData.data_reuniao, formData.tema, reuniaoId);
            if (isDuplicate) {
                addToast(`Já existe reunião com este tema nesta data`, 'warning');
                setSubmitting(false);
                return;
            }

            await atualizarReuniao(reuniaoId, formData);
            addToast('Reunião atualizada com sucesso', 'success');
            setTimeout(() => router.push('/reunioes'), 1000);
        } catch (e: any) {
            addToast(e.message || 'Erro ao atualizar', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile || !reuniaoId) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            // Simulação de progresso
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 90) setUploadProgress(progress); else clearInterval(interval);
            }, 200);

            const publicUrl = await uploadMaterialReuniao(reuniaoId, selectedFile);
            clearInterval(interval);
            setUploadProgress(100);

            setFormData(prev => ({ ...prev, caminho_pdf: publicUrl }));
            setSelectedFile(null);
            addToast('Material enviado com sucesso!', 'success');
        } catch (e: any) {
            addToast(e.message || 'Erro no upload', 'error');
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12 font-sans">
            <ToastContainer />
            
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 pt-8 pb-24 px-4 sm:px-8 shadow-lg">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/reunioes" className="bg-white/20 p-3 rounded-2xl text-white hover:bg-white/30 transition-all active:scale-90 backdrop-blur-md border border-white/10">
                            <FaArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3"><FaPen /> Editar Reunião</h1>
                            <p className="text-emerald-100 text-sm font-medium opacity-80 uppercase tracking-widest">Atualizar Informações</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Container Principal */}
            <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-12">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 sm:p-10 space-y-10">
                        
                        <form onSubmit={handleSubmit} className="space-y-10">
                            {/* Dados Básicos */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><FaBookOpen size={16}/></div> Dados Principais
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField 
                                        label="Data da Reunião" 
                                        name="data_reuniao" 
                                        type="date" 
                                        value={formData.data_reuniao} 
                                        onChange={handleChange} 
                                        required 
                                        icon={FaCalendarAlt} 
                                    />
                                    <InputField 
                                        label="Tema / Palavra" 
                                        name="tema" 
                                        value={formData.tema} 
                                        onChange={handleChange} 
                                        required 
                                        icon={FaBookOpen} 
                                        placeholder="Ex: A Parábola do Semeador"
                                    />
                                </div>
                            </section>

                            {/* Liderança */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><FaUser size={16}/></div> Liderança
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CustomSelectSheet
                                        label="Ministrador Principal"
                                        icon={<FaUser />}
                                        value={formData.ministrador_principal}
                                        onChange={(val) => handleSelectChange('ministrador_principal', val)}
                                        options={membros}
                                    />
                                    <CustomSelectSheet
                                        label="Min. Secundário"
                                        icon={<FaUser />}
                                        value={formData.ministrador_secundario}
                                        onChange={(val) => handleSelectChange('ministrador_secundario', val)}
                                        options={membros}
                                        allowNone
                                        placeholder="Opcional"
                                    />
                                    <div className="md:col-span-2">
                                        <CustomSelectSheet
                                            label="Responsável Kids"
                                            icon={<FaChild />}
                                            value={formData.responsavel_kids}
                                            onChange={(val) => handleSelectChange('responsavel_kids', val)}
                                            options={membros}
                                            allowNone
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Material PDF */}
                            <section className="space-y-6">
                                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-4">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><FaFilePdf size={16}/></div> Material de Apoio
                                </h2>
                                
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-6">
                                    {formData.caminho_pdf && (
                                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-red-50 text-red-500 rounded-xl"><FaFilePdf size={20}/></div>
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase">Arquivo Atual</p>
                                                    <a href={formData.caminho_pdf} target="_blank" className="text-sm font-bold text-emerald-600 hover:underline">Visualizar PDF/PPT</a>
                                                </div>
                                            </div>
                                            <FaCheckCircle className="text-emerald-500" />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <label className={`
                                            flex flex-col items-center justify-center w-full h-32 
                                            border-2 border-dashed rounded-2xl cursor-pointer transition-all
                                            ${selectedFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-emerald-300'}
                                        `}>
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                {selectedFile ? (
                                                    <>
                                                        <FaCheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                                                        <p className="text-sm text-emerald-700 font-bold px-4 text-center truncate w-full">{selectedFile.name}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCloudUploadAlt className="w-8 h-8 text-gray-400 mb-2" />
                                                        <p className="text-sm text-gray-500 font-bold">Toque para selecionar arquivo</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">PDF ou PPT</p>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" className="hidden" accept=".pdf,.ppt,.pptx" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} disabled={uploading} />
                                        </label>

                                        {uploading && (
                                            <div className="space-y-1">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-center text-purple-600 font-bold uppercase">Enviando... {uploadProgress}%</p>
                                            </div>
                                        )}
                                        
                                        <button 
                                            type="button" 
                                            onClick={handleFileUpload} 
                                            disabled={uploading || !selectedFile} 
                                            className="w-full bg-purple-50 text-purple-600 border border-purple-100 py-3 rounded-2xl font-bold text-sm hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />} Upload Arquivo
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-50">
                                <Link href="/reunioes" className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center">Cancelar</Link>
                                <button 
                                    type="submit" 
                                    disabled={submitting || uploading} 
                                    className="px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-emerald-200 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tighter"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : <FaSave />} Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}