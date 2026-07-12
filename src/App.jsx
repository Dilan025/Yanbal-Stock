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
    <nav className="bottom-nav">
      <Link 
        to="/" 
        className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
      >
        <Package size={24} />
        <span>Inventario</span>
      </Link>
      <Link 
        to="/loans" 
        className={`nav-item ${location.pathname === '/loans' ? 'active' : ''}`}
      >
        <Repeat size={24} />
        <span>Préstamos</span>
      </Link>
      <Link 
        to="/history" 
        className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}
      >
        <Activity size={24} />
        <span>Historial</span>
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
    <div className="app-container">
      <header className="app-header">
        <div className="container app-header-content">
          <div className="brand-container">
            <img src="/yanbal-logo.svg" alt="Yanbal" className="brand-logo" onError={(e) => { e.target.style.display='none' }}/>
            <div className="brand-title">Yanbal <span>Stock</span></div>
          </div>
          
          {/* Navegación para Escritorio */}
          <nav className="desktop-nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <Package size={20} />
              <span>Inventario</span>
            </Link>
            <Link 
              to="/loans" 
              className={`nav-link ${location.pathname === '/loans' ? 'active' : ''}`}
            >
              <Repeat size={20} />
              <span>Préstamos</span>
            </Link>
            <Link 
              to="/history" 
              className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}
            >
              <Activity size={20} />
              <span>Historial</span>
            </Link>
          </nav>

          <div className="header-actions">
            
            {/* Nombre de la Cuenta */}
            <div 
              className="account-badge"
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
              className="btn btn-ghost btn-icon"
              title="Cerrar Sesión"
              onClick={handleLogout}
            >
              <LogOut size={20} />
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <PlusCircle size={20} />
              <span className="hide-mobile">Nuevo Producto</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
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
