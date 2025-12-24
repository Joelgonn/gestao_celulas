// src/components/MainLayout.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image'; 
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner'; // Caminho absoluto
import {
  FaHome,
  FaUsers,
  FaUserFriends,
  FaCalendarAlt,
  FaChartBar,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaBookOpen,
  FaUserCog 
} from 'react-icons/fa';

import useToast from '@/hooks/useToast'; 

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
  isHidden?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, children, isActive, isHidden, onClick }) => {
  if (isHidden) return null;
  
  const activeClass = isActive 
    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
    : 'text-orange-100 hover:bg-orange-700 hover:text-white hover:bg-opacity-80';
  
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeClass}`}
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-orange-200'}`}>
        {icon}
      </div>
      <span className="flex-1 truncate">{children}</span>
      {isActive && (
        <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
      )}
    </Link>
  );
};

const LogoutButton: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
      onLogout?.();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <button
      onClick={handleLogout}
      className="w-full text-left py-3 px-4 rounded-xl text-sm font-medium text-red-100 hover:bg-red-700 hover:text-white transition-all duration-200 flex items-center space-x-3 group"
    >
      <FaSignOutAlt className="text-lg group-hover:scale-110 transition-transform duration-200" />
      <span>Sair</span>
    </button>
  );
};

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { addToast, ToastContainer } = useToast(); 
  
  const [userRole, setUserRole] = useState<'admin' | 'líder' | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUserRole() {
      setLoadingRole(true);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profile) {
            setUserRole(profile.role as 'admin' | 'líder');
            setUserProfile(profile);
          } else {
            setUserRole(null);
            addToast('Erro ao carregar perfil', 'error');
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Role fetch error:", error);
        addToast('Erro ao carregar usuário', 'error');
      } finally {
        setLoadingRole(false);
      }
    }
    fetchUserRole();
  }, [addToast]); 

  // Fecha sidebar ao clicar fora (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutsideDropdown = (event: MouseEvent) => {
      if (userDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, [userDropdownOpen]);

  const navItems = [
    { href: '/dashboard', icon: <FaHome className="text-lg" />, label: 'Dashboard', forAdmin: true, forLider: true },
    { href: '/admin/users', icon: <FaUserCog className="text-lg" />, label: 'Usuários', forAdmin: true, forLider: false },
    { href: '/admin/celulas', icon: <FaHome className="text-lg" />, label: 'Células', forAdmin: true, forLider: false },
    { href: '/admin/palavra-semana', icon: <FaBookOpen className="text-lg" />, label: 'Palavra', forAdmin: true, forLider: false },
    { href: '/membros', icon: <FaUsers className="text-lg" />, label: 'Membros', forAdmin: true, forLider: true },
    { href: '/visitantes', icon: <FaUserFriends className="text-lg" />, label: 'Visitantes', forAdmin: true, forLider: true },
    { href: '/reunioes', icon: <FaCalendarAlt className="text-lg" />, label: 'Reuniões', forAdmin: true, forLider: true },
    { href: '/relatorios', icon: <FaChartBar className="text-lg" />, label: 'Relatórios', forAdmin: true, forLider: true },
  ];

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredNavItems = navItems.filter(item => {
    if (userRole === 'admin') return item.forAdmin;
    if (userRole === 'líder') return item.forLider;
    return false;
  });

  const currentPageTitle = filteredNavItems.find(item => pathname.startsWith(item.href))?.label || 'Apascentar';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ToastContainer />

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Mobile Sidebar */}
      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-orange-700 to-orange-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-orange-800/50 border-b border-orange-600/30">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" priority />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Apascentar</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white/80 hover:text-white p-1 rounded-md transition-colors">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="px-4 py-6 border-b border-orange-600/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white border-2 border-orange-400">
              <FaUser />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{userProfile?.nome_completo || 'Usuário'}</p>
              <p className="text-orange-200 text-xs truncate uppercase tracking-wider">{userRole === 'admin' ? 'Admin' : 'Líder'}</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              isActive={pathname.startsWith(item.href)}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavItem>
          ))}
          <div className="pt-4 mt-4 border-t border-orange-600/30">
            <NavItem href="/profile" icon={<FaUser className="text-lg" />} isActive={pathname === '/profile'} onClick={() => setSidebarOpen(false)}>
              Perfil
            </NavItem>
            <LogoutButton onLogout={() => setSidebarOpen(false)} />
          </div>
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col w-64 bg-gradient-to-b from-orange-700 to-orange-900 shadow-xl z-30">
        <div className="flex items-center justify-center h-16 px-4 bg-orange-800/50 border-b border-orange-600/30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" priority />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Apascentar</span>
          </div>
        </div>
        
        <div className="px-4 py-6 border-b border-orange-600/30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white border-2 border-orange-400 shadow-sm">
              <FaUser />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{userProfile?.nome_completo || 'Usuário'}</p>
              <p className="text-orange-200 text-xs truncate uppercase tracking-wider">{userRole === 'admin' ? 'Admin' : 'Líder'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} isActive={pathname.startsWith(item.href)}>
              {item.label}
            </NavItem>
          ))}
        </nav>

        <div className="p-4 bg-orange-900/50 border-t border-orange-600/30 flex-shrink-0 space-y-1">
          <NavItem href="/profile" icon={<FaUser className="text-lg" />} isActive={pathname === '/profile'}>
            Perfil
          </NavItem>
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm z-20 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Menu"
            >
              <FaBars size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 truncate">{currentPageTitle}</h1>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center border border-orange-200">
                <FaUser size={14} />
              </div>
              <FaChevronDown className={`text-gray-400 text-xs transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''} hidden sm:block`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{userProfile?.nome_completo}</p>
                  <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                >
                  <FaUser className="mr-3 text-gray-400" /> Meu Perfil
                </Link>
                <button
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    await supabase.auth.signOut();
                    router.replace('/login');
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FaSignOutAlt className="mr-3" /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;