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
        return <Trash2 className="text-slate-500 dark:text-slate-400" size={20} />;
      case 'LOAN_LENT':
      case 'LOAN_RETURNED':
        return <ArrowRightLeft className="text-blue-500" size={20} />;
      default:
        return <Activity className="text-slate-500 dark:text-slate-400" size={20} />;
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
      className="max-w-4xl mx-auto transition-colors"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white m-0">Historial de Movimientos</h2>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border border-orange-200 dark:border-orange-800"
        >
          Últimos {history.length}
        </motion.div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 transition-colors">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Activity className="animate-pulse mb-4 text-slate-300 dark:text-slate-600" size={48} />
            <p>Cargando historial...</p>
          </div>
        ) : history.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400"
          >
            <Activity size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p>Aún no hay movimientos registrados.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col"
          >
            {history.map((item, index) => (
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.01, x: 5 }}
                key={item.id} 
                className="flex group relative pb-6"
              >
                
                {/* Columna Izquierda: Icono y Línea */}
                <div className="flex flex-col items-center mr-6">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:shadow-md transition-shadow bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 ${item.action.includes('ADD') || item.action.includes('UP') ? 'text-emerald-500' : item.action.includes('DOWN') ? 'text-red-500' : item.action.includes('LOAN') ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {getActionIcon(item.action)}
                  </div>
                  {index !== history.length - 1 && (
                    <div className="w-px h-full bg-slate-200 dark:bg-slate-700 absolute top-10 left-5 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors"></div>
                  )}
                </div>
                
                {/* Columna Derecha: Tarjeta de Contenido */}
                <div className="flex-1">
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4 rounded-xl group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="font-bold text-slate-800 dark:text-white text-lg">{item.productName}</div>
                      <time className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 font-medium transition-colors">
                        <Clock size={12} className="mr-1" />
                        {formatDate(item.timestamp)}
                      </time>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
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
