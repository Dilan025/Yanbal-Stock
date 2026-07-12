import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Package, Repeat, PlusCircle, Activity, LogOut, User, Loader2 } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import History from './pages/History';
import Login from './pages/Login';
import AddProductModal from './components/AddProductModal';
import './App.css';

// Componente para el menú de navegación inferior (para móviles) o lateral (escritorio)
function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 md:hidden z-50">
      <Link 
        to="/" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-orange-500' : 'text-slate-500'}`}
      >
        <Package size={24} />
        <span className="text-xs font-medium mt-1">Inventario</span>
      </Link>
      <Link 
        to="/loans" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/loans' ? 'text-orange-500' : 'text-slate-500'}`}
      >
        <Repeat size={24} />
        <span className="text-xs font-medium mt-1">Préstamos</span>
      </Link>
      <Link 
        to="/history" 
        className={`flex flex-col items-center p-2 rounded-lg transition-colors ${location.pathname === '/history' ? 'text-orange-500' : 'text-slate-500'}`}
      >
        <Activity size={24} />
        <span className="text-xs font-medium mt-1">Historial</span>
      </Link>
    </nav>
  );
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("Cargando...");
  const { currentUser } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    const fetchName = async () => {
      if (!currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid, "settings", "profile"));
        if (docSnap.exists() && docSnap.data().name) {
          setAccountName(docSnap.data().name);
        } else {
          setAccountName(currentUser.email.split('@')[0]);
        }
      } catch (e) {
        setAccountName("Consultora");
      }
    };
    fetchName();
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
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-2">
            <img src="/yanbal-logo.svg" alt="Yanbal" className="h-8" onError={(e) => { e.target.style.display='none' }}/>
            <div className="text-xl font-bold text-slate-800">Yanbal <span className="text-orange-500">Stock</span></div>
          </div>
          
          {/* Navegación para Escritorio */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors ${location.pathname === '/' ? 'bg-slate-100 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Package size={20} />
              <span>Inventario</span>
            </Link>
            <Link 
              to="/loans" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors ${location.pathname === '/loans' ? 'bg-slate-100 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Repeat size={20} />
              <span>Préstamos</span>
            </Link>
            <Link 
              to="/history" 
              className={`flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors ${location.pathname === '/history' ? 'bg-slate-100 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Activity size={20} />
              <span>Historial</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            
            {/* Nombre de la Cuenta */}
            <div 
              className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200 transition-colors"
              title="Cambiar Nombre de Cuenta"
              onClick={async () => {
                const newName = prompt("¿Cuál es el nombre de la Consultora/Dueño de la cuenta?", accountName);
                if (newName && newName.trim().length > 0) {
                  try {
                    await setDoc(doc(db, "users", currentUser.uid, "settings", "profile"), { name: newName.trim() });
                    setAccountName(newName.trim());
                    toast.success("Nombre actualizado");
                  } catch (e) {
                    toast.error("Error al actualizar el nombre");
                  }
                }
              }}
            >
              <User size={16} />
              <span>{accountName}</span>
            </div>

            <button 
              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-colors"
              title="Cerrar Sesión"
              onClick={handleLogout}
            >
              <LogOut size={20} />
            </button>
            <button 
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusCircle size={20} />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>

      <Navigation />
      
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
        <App />
      </Router>
    </AuthProvider>
  );
}
