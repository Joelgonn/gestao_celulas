// src/app/layout.tsx
import AuthLayout from '@/components/AuthLayout';
import './globals.css'; // Mantenha a importação do Tailwind CSS

export const metadata = { // Adicionado metadados básicos
  title: 'Sistema de Gestão de Células',
  description: 'Sistema para gerenciamento de membros, visitantes e reuniões de células.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthLayout>
          {children}
        </AuthLayout>
      </body>
    </html>
  );
}