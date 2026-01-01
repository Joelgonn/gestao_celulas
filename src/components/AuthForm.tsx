'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; 
import useToast from '@/hooks/useToast'; 
import { 
  FaEnvelope, 
  FaMagic, 
  FaCheckCircle, 
  FaInfoCircle, 
  FaKey,
  FaLock,
  FaEye,      
  FaEyeSlash, 
  FaSpinner,
  FaSignInAlt
} from 'react-icons/fa';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [authMethod, setAuthMethod] = useState<'magic_link' | 'password'>('magic_link');
  const [showPassword, setShowPassword] = useState(false); 

  const router = useRouter();
  const { addToast, ToastContainer } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailValue = email.trim();

      if (!emailValue.includes('@')) {
        addToast('Insira um email válido.', 'error');
        setLoading(false);
        return;
      }

      if (authMethod === 'magic_link') {
        // Criamos a URL de redirecionamento baseada no ambiente atual
        // Importante: Esta URL DEVE estar cadastrada em 'Redirect URLs' no dashboard do Supabase
        const redirectTo = `${window.location.origin}/dashboard`;

        const { error } = await supabase.auth.signInWithOtp({
          email: emailValue,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) throw error;
        
        setStep('success');
        addToast('Link de acesso enviado!', 'success');

      } else {
        if (!password) {
            addToast('Digite sua senha.', 'warning');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: emailValue,
            password: password
        });

        if (error) throw error;

        addToast('Login realizado com sucesso!', 'success');
        // Usamos replace para evitar que o usuário volte para a tela de login pelo botão "voltar"
        router.replace('/dashboard');
      }
      
    } catch (error: any) {
      console.error('AuthForm error:', error);
      let msg = error.message;
      if (msg.includes('Invalid login')) msg = 'E-mail ou senha incorretos.';
      if (msg.includes('too many requests')) msg = 'Muitas solicitações. Tente novamente mais tarde.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setEmail('');
    setPassword('');
    setStep('form');
    setLoading(false);
    setShowPassword(false);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
        <ToastContainer />
        <div className="w-full max-w-md animate-in zoom-in duration-300">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-orange-50">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="text-green-600 text-4xl" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifique seu Email</h2>
            <p className="text-gray-600 mb-6">Enviamos um link de acesso para <br/><span className="font-semibold text-orange-600">{email}</span></p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex gap-3">
              <FaInfoCircle className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                O link expira em breve. Se não encontrar, verifique a caixa de Spam.
              </p>
            </div>

            <button
              onClick={handleResetForm}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-orange-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
      <ToastContainer />
      
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-50">
          
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner p-2">
              <Image 
                src="/logo.png" 
                alt="Logo Apascentar" 
                width={64} 
                height={64} 
                className="object-contain" 
                priority
              />
            </div>
            <h1 className="text-2xl font-bold mb-2">Apascentar</h1>
            <p className="text-orange-100 text-sm mt-1">Gestão de Células</p>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setAuthMethod('magic_link')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                authMethod === 'magic_link'
                  ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaMagic /> Sem Senha
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                authMethod === 'password'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaKey /> Com Senha
            </button>
          </div>

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
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-base text-gray-800 placeholder:text-gray-400"
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
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-base text-gray-800 placeholder:text-gray-400"
                      required
                      disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3 cursor-pointer bg-gradient-to-r ${
                    authMethod === 'magic_link' 
                    ? 'from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                    : 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
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

        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Apascentar Células &copy; 2025
          </p>
        </div>
      </div>
    </div>
  );
}