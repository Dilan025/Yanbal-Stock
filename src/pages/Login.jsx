import React, { useState } from 'react';
import { Lock, LogIn, UserPlus, Loader2, Phone } from 'lucide-react';
import { auth, db, googleProvider, facebookProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

export default function Login({ initialIsRegistering = false, onBack }) {
  const [isLogin, setIsLogin] = useState(!initialIsRegistering);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleSocialLogin = async (provider) => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      // We don't strictly need to create a profile here if it's just login, but we can to be safe
      // Firestore will create it later if needed or we could do it here
      console.log("Logged in with social provider:", result.user.email);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('Ya existe una cuenta con este correo usando otro método (por ejemplo, Google o Correo manual).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // user closed popup, do nothing
      } else {
        setError('Ocurrió un error con el inicio de sesión social.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (phone.trim() !== '') {
          await setDoc(doc(db, 'users', userCredential.user.uid, 'settings', 'profile'), {
            phone: phone.trim()
          }, { merge: true });
        }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          Volver
        </button>
      )}
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-md text-center transition-colors">
        <div className="bg-orange-100 dark:bg-orange-900/50 text-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Lock size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Yanbal <span className="text-orange-500">Stock</span></h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {isLogin ? 'Inicia sesión para acceder a tu inventario.' : 'Crea una cuenta para tu nuevo inventario.'}
        </p>
        
        <div className="flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleSocialLogin(googleProvider)}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          
          <button
            type="button"
            onClick={() => handleSocialLogin(facebookProvider)}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
            </svg>
            Continuar con Facebook
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">O {isLogin ? 'inicia sesión' : 'regístrate'} con tu correo</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="ejemplo@correo.com"
                className="w-full pl-4 pr-24 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                required
              />
              {!email.includes('@') && email.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEmail(email + '@gmail.com')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  @gmail.com
                </button>
              )}
            </div>
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
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Número de WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +51 987654321"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required={!isLogin}
                />
              </div>
            </div>
          )}
          
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
