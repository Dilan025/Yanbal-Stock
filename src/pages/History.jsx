import React, { useState, useEffect } from 'react';
import { Activity, Clock, Plus, Minus, Trash2, ArrowRightLeft } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'users', currentUser.uid, 'history'), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = [];
      snapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() });
      });
      setHistory(historyData);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar historial:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Justo ahora';
    const date = timestamp.toDate();
    return date.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'ADD_PRODUCT':
      case 'STOCK_UP':
        return <Plus className="text-green-500" size={20} />;
      case 'STOCK_DOWN':
        return <Minus className="text-red-500" size={20} />;
      case 'DELETE_PRODUCT':
        return <Trash2 className="text-gray-500" size={20} />;
      case 'LOAN_LENT':
      case 'LOAN_RETURNED':
        return <ArrowRightLeft className="text-blue-500" size={20} />;
      default:
        return <Activity className="text-gray-500" size={20} />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'ADD_PRODUCT':
      case 'STOCK_UP':
        return 'add';
      case 'STOCK_DOWN':
        return 'remove';
      case 'DELETE_PRODUCT':
        return 'delete';
      case 'LOAN_LENT':
      case 'LOAN_RETURNED':
        return 'loan';
      default:
        return 'delete';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container"
      style={{ position: 'relative' }}
    >
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.025em' }}>Historial de Movimientos</h2>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="badge badge-primary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
        >
          Últimos {history.length}
        </motion.div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Activity className="animate-pulse" size={48} style={{ marginBottom: '1rem', color: '#D1D5DB' }} />
            <p>Cargando historial...</p>
          </div>
        ) : history.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}
          >
            <Activity size={48} style={{ margin: '0 auto 1rem', color: '#D1D5DB' }} />
            <p>Aún no hay movimientos registrados.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="timeline-list"
          >
            {history.map((item, index) => (
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.01, x: 5 }}
                key={item.id} 
                className="timeline-item group"
              >
                
                {/* Columna Izquierda: Icono y Línea */}
                <div className="timeline-left">
                  <div className={`timeline-icon-container shadow-sm group-hover:shadow-md transition-shadow ${getActionColor(item.action)}`}>
                    {getActionIcon(item.action)}
                  </div>
                  {index !== history.length - 1 && (
                    <div className="timeline-line group-hover:bg-gray-300 transition-colors"></div>
                  )}
                </div>
                
                {/* Columna Derecha: Tarjeta de Contenido */}
                <div className="timeline-right">
                  <div className="timeline-card group-hover:border-gray-300 transition-colors shadow-sm">
                    <div className="timeline-header flex-wrap gap-2">
                      <div className="font-extrabold text-gray-800 text-lg">{item.productName}</div>
                      <time className="timeline-time bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <Clock size={12} className="mr-1" />
                        {formatDate(item.timestamp)}
                      </time>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {item.details}
                    </div>
                  </div>
                </div>
                
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
