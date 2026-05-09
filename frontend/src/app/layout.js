import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'YBG Yield Business Gateway',
  description: 'Local-first Accounting and ERP Solutions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a2540',
                color:      '#f1f5f9',
                border:     '1px solid #243050',
                borderRadius: '12px',
                fontSize:   '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: 'var(--color-surface)' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--color-surface)' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
