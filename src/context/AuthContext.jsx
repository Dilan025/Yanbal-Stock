import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Inactivity Timeout Logic (30 minutes)
  useEffect(() => {
    let inactivityTimer;
    
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // Solo iniciar el temporizador si el usuario está logueado
      if (currentUser) {
        inactivityTimer = setTimeout(() => {
          signOut(auth).then(() => {
            toast('Tu sesión ha expirado por inactividad', { icon: '🔒' });
          });
        }, 30 * 60 * 1000); // 30 minutos
      }
    };

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    if (currentUser) {
      resetTimer();
      events.forEach(event => window.addEventListener(event, resetTimer));
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  const value = {
    currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
