import React, { useState } from 'react';
import { Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico primero para enviarte el enlace de recuperación.');
      return;
    }
    
    setResetLoading(true);
    setError('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Se ha enviado un enlace de recuperación a tu correo.');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No hay ninguna cuenta registrada con este correo.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El correo ingresado no es válido.');
      } else {
        setError('No se pudo enviar el correo de recuperación. Inténtalo de nuevo.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md text-center transition-colors">
        <div className="bg-orange-100 dark:bg-orange-900/50 text-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Lock size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Yanbal <span className="text-orange-500">Stock</span></h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {isLogin ? 'Inicia sesión para acceder a tu inventario.' : 'Crea una cuenta para tu nuevo inventario.'}
        </p>
        
        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="ejemplo@correo.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">Contraseña</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-xs font-bold text-orange-500 hover:text-orange-600 hover:underline disabled:opacity-50"
                >
                  {resetLoading ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
                minLength="6"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">{error}</div>}
          
          <button 
            type="submit" 
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm mt-6"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'Entrar al Sistema' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button 
              type="button"
              className="ml-1 text-orange-500 font-bold hover:underline bg-transparent border-none cursor-pointer"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmail('');
                setPassword('');
              }}
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
