// src/hooks/useAuth.tsx
// Contexto raíz de autenticación. Envuelve toda la app (ver app/_layout.tsx) y
// expone el estado de auth de forma reactiva, para que ninguna pantalla tenga
// que escuchar onAuthStateChanged por su cuenta ni mantener un MOCK_USER_ID.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { listenToAuthState } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true mientras Firebase resuelve el estado inicial de sesión
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAnonymous: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
