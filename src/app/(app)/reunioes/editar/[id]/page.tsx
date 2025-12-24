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
    FaCheckCircle
} from 'react-icons/fa';

import {
    getReuniao,
    atualizarReuniao,
    listarMembros,
    verificarDuplicidadeReuniao,
    uploadMaterialReuniao,
} from '@/lib/data';

import { Membro, ReuniaoFormData } from '@/lib/types';
import { formatDateForInput, formatDateForDisplay } from '@/utils/formatters';
import useToast from '@/hooks/useToast';
import LoadingSpinner from '@/components/LoadingSpinner';

// --- COMPONENTE CUSTOMIZADO DE SELEÇÃO (BOTTOM SHEET) ---
// (Reutilizado da página 'Nova Reunião' para consistência)
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

    const handleSelect = (id: string | null) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                {icon} {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow outline-none text-left"
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
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar membro..." 
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-base"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {allowNone && (
                                <button
                                    type="button"
                                    onClick={() => handleSelect(null)}
                                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${!value ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <span>Nenhum / Remover seleção</span>
                                    {!value && <FaCheckCircle className="text-teal-500" />}
                                </button>
                            )}
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((membro) => {
                                    const isSelected = value === membro.id;
                                    return (
                                        <button
                                            key={membro.id}
                                            type="button"
                                            onClick={() => handleSelect(membro.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${isSelected ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-base">{membro.nome}</span>
                                            {isSelected && <FaCheckCircle className="text-teal-500 text-lg" />}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhum membro encontrado.
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


export default function EditReuniaoPage() {
    const params = useParams();
    const reuniaoId = params.id as string;

    const [formData, setFormData] = useState<ReuniaoFormData>({
        data_reuniao: '',
        tema: '',
        ministrador_principal: null,
        ministrador_secundario: null,
        responsavel_kids: null,
        caminho_pdf: null,
    });
    const [membros, setMembros] = useState<Membro[]>([]);
    const { addToast, ToastContainer } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const router = useRouter();

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
                    addToast('Reunião não encontrada ou acesso negado', 'error');
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

                // addToast('Informações carregadas', 'success'); // Opcional para não poluir
            } catch (e: any) {
                console.error("Erro ao buscar dados:", e);
                addToast(e.message || 'Erro ao carregar dados', 'error');
                setTimeout(() => router.replace('/reunioes'), 2000);
            } finally {
                setLoading(false);
            }
        };

        if (reuniaoId) {
            fetchData();
        }
    }, [reuniaoId, router, addToast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? null : value }));
    }, []);

    // Handler para o Custom Select
    const handleSelectChange = useCallback((name: string, value: string | null) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (!formData.tema.trim()) {
            addToast('Tema é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.ministrador_principal) {
            addToast('Ministrador Principal é obrigatório', 'error');
            setSubmitting(false);
            return;
        }
        if (!formData.data_reuniao) {
            addToast('Data é obrigatória', 'error');
            setSubmitting(false);
            return;
        }

        try {
            const isDuplicate = await verificarDuplicidadeReuniao(formData.data_reuniao, formData.tema, reuniaoId);
            if (isDuplicate) {
                addToast(`Já existe reunião com tema '${formData.tema}' nesta data`, 'warning');
                setSubmitting(false);
                return;
            }

            await atualizarReuniao(reuniaoId, formData);
            addToast('Reunião atualizada com sucesso', 'success', 3000);
            setTimeout(() => {
                router.push('/reunioes');
            }, 1500);

        } catch (e: any) {
            console.error("Erro ao atualizar:", e);
            addToast(e.message || 'Erro ao atualizar reunião', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            addToast('Selecione um arquivo primeiro', 'error');
            return;
        }
        if (!reuniaoId) {
            addToast('ID inválido', 'error');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
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

            addToast('Material enviado com sucesso!', 'success', 4000);

        } catch (e: any) {
            console.error("Erro upload:", e);
            addToast(e.message || 'Erro no upload', 'error');
            setUploadProgress(0);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 sm:py-8 px-2 sm:px-6 lg:px-8">
            <ToastContainer />

            <div className="max-w-4xl mx-auto mt-4 sm:mt-0">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    
                    {/* Header Responsivo */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-6 sm:px-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                    <FaCalendarAlt className="w-6 h-6 sm:w-8 sm:h-8" />
                                    Editar Reunião
                                </h1>
                                <p className="text-teal-100 mt-1 text-sm sm:text-base">
                                    Atualize as informações da célula
                                </p>
                            </div>
                            
                            <Link 
                                href="/reunioes" 
                                className="inline-flex justify-center items-center px-4 py-3 sm:py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/30 text-sm font-medium w-full sm:w-auto"
                            >
                                <FaArrowLeft className="w-3 h-3 mr-2" />
                                Voltar
                            </Link>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-4 sm:p-8">
                        {loading ? (
                            <div className="text-center py-16">
                                <LoadingSpinner />
                                <p className="mt-4 text-gray-500 font-medium animate-pulse">Carregando dados...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                                
                                {/* Bloco: Dados Principais */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1">
                                        <label htmlFor="data_reuniao" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FaCalendarAlt className="text-teal-500" /> Data *
                                        </label>
                                        <input
                                            type="date"
                                            id="data_reuniao"
                                            name="data_reuniao"
                                            value={formData.data_reuniao}
                                            onChange={handleChange}
                                            required
                                            // 'text-base' previne zoom no iOS
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow outline-none"
                                        />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label htmlFor="tema" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FaBookOpen className="text-teal-500" /> Tema / Palavra *
                                        </label>
                                        <input
                                            type="text"
                                            id="tema"
                                            name="tema"
                                            value={formData.tema}
                                            onChange={handleChange}
                                            required
                                            placeholder="Digite o tema"
                                            className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-shadow outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Bloco: Liderança com Selects Customizados */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Liderança & Apoio</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                        <CustomSelectSheet
                                            label="Ministrador Principal *"
                                            icon={<FaUser className="text-teal-500" />}
                                            value={formData.ministrador_principal}
                                            onChange={(val) => handleSelectChange('ministrador_principal', val)}
                                            options={membros}
                                            placeholder="Selecione..."
                                        />

                                        <CustomSelectSheet
                                            label="Min. Secundário"
                                            icon={<FaUser className="text-gray-400" />}
                                            value={formData.ministrador_secundario}
                                            onChange={(val) => handleSelectChange('ministrador_secundario', val)}
                                            options={membros}
                                            allowNone={true}
                                            placeholder="Opcional"
                                        />

                                        <CustomSelectSheet
                                            label="Resp. Kids"
                                            icon={<FaChild className="text-blue-400" />}
                                            value={formData.responsavel_kids}
                                            onChange={(val) => handleSelectChange('responsavel_kids', val)}
                                            options={membros}
                                            allowNone={true}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>

                                {/* Bloco: Upload / Material */}
                                <div className="bg-blue-50/80 rounded-xl p-4 sm:p-6 border border-blue-200">
                                    <h3 className="text-base sm:text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                                        <FaFilePdf /> Material da Reunião
                                    </h3>
                                    
                                    {/* Exibição do Material Atual */}
                                    {formData.caminho_pdf && (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-lg border border-blue-100 mb-5 shadow-sm gap-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-red-50 rounded-lg">
                                                    <FaFilePdf className="w-6 h-6 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Arquivo Atual</p>
                                                    <p className="text-xs text-gray-500">Toque para visualizar</p>
                                                </div>
                                            </div>
                                            <a 
                                                href={formData.caminho_pdf} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Visualizar
                                            </a>
                                        </div>
                                    )}

                                    {/* Área de Upload */}
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="material_file" className="block text-sm font-semibold text-gray-700 mb-2">
                                                {formData.caminho_pdf ? 'Substituir arquivo (PDF/PPT)' : 'Enviar novo arquivo (PDF/PPT)'}
                                            </label>
                                            
                                            <label 
                                                htmlFor="material_file" 
                                                className={`
                                                    flex flex-col items-center justify-center w-full h-24 sm:h-28
                                                    border-2 border-dashed rounded-lg cursor-pointer transition-colors
                                                    ${selectedFile ? 'border-teal-400 bg-teal-50' : 'border-blue-300 bg-white hover:bg-blue-50'}
                                                `}
                                            >
                                                 <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    {selectedFile ? (
                                                        <>
                                                            <FaCheckCircle className="w-6 h-6 text-teal-500 mb-1" />
                                                            <p className="text-sm text-teal-700 font-medium px-2 text-center truncate w-full max-w-[250px]">
                                                                {selectedFile.name}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-gray-500 font-medium">Toque para selecionar</p>
                                                            <p className="text-xs text-gray-400">PDF ou PPT</p>
                                                        </>
                                                    )}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    id="material_file" 
                                                    accept=".pdf,.ppt,.pptx" 
                                                    onChange={handleFileChange} 
                                                    disabled={uploading} 
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        {uploading && (
                                            <div className="space-y-1">
                                                <div className="w-full bg-blue-200 rounded-full h-2">
                                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                                <p className="text-xs text-center text-blue-700">Enviando... {uploadProgress}%</p>
                                            </div>
                                        )}
                                        
                                        <button 
                                            type="button" 
                                            onClick={handleFileUpload} 
                                            disabled={uploading || !selectedFile} 
                                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            {uploading ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            ) : (
                                                <FaUpload />
                                            )}
                                            {uploading ? 'Enviando...' : 'Fazer Upload do Material'}
                                        </button>
                                    </div>
                                </div>

                                {/* Botão Submit */}
                                <button 
                                    type="submit" 
                                    disabled={submitting || uploading} 
                                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-lg font-bold py-4 px-6 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Atualizando...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}