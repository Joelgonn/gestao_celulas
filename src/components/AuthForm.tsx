// src/components/AuthForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import useToast from '@/hooks/useToast'; // Importando o hook global
import { 
  FaEnvelope, 
  FaMagic, 
  FaCheckCircle, 
  FaInfoCircle, 
  FaShieldAlt,
  FaKey,
  FaLock,
  FaSpinner,
  FaSignInAlt
} from 'react-icons/fa';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [authMethod, setAuthMethod] = useState<'magic_link' | 'password'>('magic_link');

  const router = useRouter();
  const { addToast, ToastContainer } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Validação básica
      if (!email.trim().includes('@')) {
        addToast('Insira um email válido.', 'error');
        setLoading(false);
        return;
      }

      if (authMethod === 'magic_link') {
        // --- LOGIN COM LINK MÁGICO ---
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;
        
        setStep('success');
        addToast('Link enviado com sucesso!', 'success');

      } else {
        // --- LOGIN COM SENHA ---
        if (!password) {
            addToast('Digite sua senha.', 'warning');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) throw error;

        addToast('Login realizado!', 'success');
        router.push('/dashboard');
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      let msg = error.message;
      if (msg.includes('Invalid login')) msg = 'Credenciais incorretas.';
      addToast(msg, 'error');
      setLoading(false); // Garante que o loading pare se der erro
    }
  };

  const handleResetForm = () => {
    setEmail('');
    setPassword('');
    setStep('form');
    setLoading(false);
  };

  // TELA DE SUCESSO (LINK MÁGICO)
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
        <ToastContainer />
        <div className="w-full max-w-md animate-in zoom-in duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-indigo-50">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="text-green-600 text-4xl" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifique seu Email</h2>
            <p className="text-gray-600 mb-6">Enviamos um link de acesso para <br/><span className="font-semibold text-indigo-600">{email}</span></p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex gap-3">
              <FaInfoCircle className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                O link expira em breve. Verifique também sua caixa de Spam ou Lixo Eletrônico.
              </p>
            </div>

            <button
              onClick={handleResetForm}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Voltar / Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE FORMULÁRIO
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <ToastContainer />
      
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FaShieldAlt className="text-3xl" />
            </div>
            <h1 className="text-2xl font-bold">Apascentar</h1>
            <p className="text-indigo-100 text-sm mt-1">Gestão de Células</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setAuthMethod('magic_link')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                authMethod === 'magic_link'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaMagic /> Sem Senha
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                authMethod === 'password'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaKey /> Com Senha
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">Email</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaEnvelope />
                  </div>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-base text-gray-800 placeholder:text-gray-400"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {authMethod === 'password' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-bold text-gray-700 ml-1">Senha</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <FaLock />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-base text-gray-800 placeholder:text-gray-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3 ${
                    authMethod === 'magic_link' 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    {authMethod === 'magic_link' ? <FaMagic /> : <FaSignInAlt />}
                    {authMethod === 'magic_link' ? 'Enviar Link de Acesso' : 'Entrar'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                    {authMethod === 'magic_link' 
                        ? 'Enviaremos um link seguro para o seu email.' 
                        : 'Acesso restrito a líderes e administradores.'}
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}