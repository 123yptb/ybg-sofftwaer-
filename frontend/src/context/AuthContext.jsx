'use client';

// This context has been migrated from the legacy Express backend (port 4000)
// to Auth.js v5 (next-auth). It now wraps SessionProvider for compatibility.

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function AuthProvider({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user ?? null;
  const loading = status === 'loading';

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/login');
  }, [router]);

  return { user, loading, logout };
}
