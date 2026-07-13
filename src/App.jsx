import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Repeat, PlusCircle, Activity, LogOut, User, Users, Loader2, Moon, Sun, DollarSign, ShoppingBag } from 'lucide-react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import History from './pages/History';
import Login from './pages/Login';
import AddProductModal from './components/AddProductModal';
import ReloadPrompt from './components/ReloadPrompt';
import Catalog from './pages/Catalog';
import Clients from './pages/Clients';
import Finances from './pages/Finances';
import Profile from './pages/Profile';
import './App.css';

// Componente para animar las páginas
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Componente para el menú de navegación inferior (para móviles) o lateral (escritorio)
function Navigation({ uid }) {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around p-2 md:hidden z-50 transition-colors">
      <Link 
        to="/" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <Package size={24} />
        <span className="text-[10px] font-medium mt-1">Inventario</span>
      </Link>
      <Link 
        to="/finances" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/finances' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <DollarSign size={24} />
        <span className="text-[10px] font-medium mt-1">Finanzas</span>
      </Link>
      <Link 
        to="/loans" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/loans' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <Repeat size={24} />
        <span className="text-[10px] font-medium mt-1">Préstamos</span>
      </Link>
      <Link 
        to="/clients" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/clients' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <Users size={24} />
        <span className="text-[10px] font-medium mt-1">Clientes</span>
      </Link>
      <Link 
        to="/profile" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/profile' ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <User size={24} />
        <span className="text-[10px] font-medium mt-1">Perfil</span>
      </Link>
    </nav>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white rounded-full transition-colors"
      title="Alternar Modo Oscuro"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("Cargando...");
  const { currentUser } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid, "settings", "profile"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().name) {
        setAccountName(docSnap.data().name);
      } else {
        setAccountName(currentUser.email.split('@')[0]);
      }
    }, (error) => {
      console.error("Error fetching profile:", error);
      setAccountName("Consultora");
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out: ", e);
    }
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-16 md:pb-0 flex flex-col transition-colors">
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-4">
          
          {/* Logo y Botón Agregar (Móvil) */}
          <div className="flex flex-row items-center justify-between w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex items-center gap-2">
              <img src="/yanbal-logo.svg" alt="Yanbal" className="h-8" onError={(e) => { e.target.style.display='none' }}/>
              <div className="text-xl font-bold text-slate-800 dark:text-white">Yanbal <span className="text-orange-500">Stock</span></div>
            </div>
            
            <button 
              className="lg:hidden flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white w-9 h-9 rounded-full font-medium transition-colors shadow-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusCircle size={20} />
            </button>
          </div>
          
          {/* Navegación para Escritorio */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-2 lg:gap-4 flex-wrap">
            <Link 
              to="/" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${location.pathname === '/' ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Package size={18} />
              <span className="text-sm lg:text-base">Inventario</span>
            </Link>
            <Link 
              to="/finances" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${location.pathname === '/finances' ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <DollarSign size={18} />
              <span className="text-sm lg:text-base">Finanzas</span>
            </Link>
            <Link 
              to="/loans" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${location.pathname === '/loans' ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Repeat size={18} />
              <span className="text-sm lg:text-base">Préstamos</span>
            </Link>
            <Link 
              to="/clients" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${location.pathname === '/clients' ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Users size={18} />
              <span className="text-sm lg:text-base">Clientes</span>
            </Link>
            <Link 
              to="/history" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${location.pathname === '/history' ? 'bg-slate-100 dark:bg-slate-700 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Activity size={18} />
              <span className="text-sm lg:text-base">Historial</span>
            </Link>
          </nav>

          {/* Controles de Usuario */}
          <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-2 lg:flex-shrink-0">
            
            {/* Nombre de la Cuenta */}
            <Link 
              to="/profile"
              className="flex items-center justify-center lg:justify-start gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-2 lg:py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-1 lg:flex-none overflow-hidden"
              title="Mi Perfil"
            >
              <User size={16} className="shrink-0" />
              <span className="truncate">{accountName}</span>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />

              <button 
                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white rounded-full transition-colors"
                title="Cerrar Sesión"
                onClick={handleLogout}
              >
                <LogOut size={20} />
              </button>
              
              {/* Botón Agregar (Escritorio) */}
              <button 
                className="hidden lg:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusCircle size={20} />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/loans" element={<PageWrapper><Loans /></PageWrapper>} />
            <Route path="/clients" element={<PageWrapper><Clients /></PageWrapper>} />
            <Route path="/finances" element={<PageWrapper><Finances /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>

      <Navigation uid={currentUser?.uid} />
      
      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default function AppWrapper() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            color: '#1E293B',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            borderRadius: '16px',
            padding: '12px 24px',
            fontFamily: "'Outfit', sans-serif"
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
        }} />
        <ReloadPrompt />
        <Routes>
          <Route path="/catalog/:uid" element={<Catalog />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
