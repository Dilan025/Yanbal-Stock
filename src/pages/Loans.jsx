import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader2, Check, Clock, Trash2 } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AddLoanModal from '../components/AddLoanModal';
import { logHistory } from '../utils/history';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users', currentUser.uid, 'loans'), orderBy('dateLent', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loansData = [];
      snapshot.forEach((doc) => {
        loansData.push({ id: doc.id, ...doc.data() });
      });
      setLoans(loansData);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar préstamos:", error);
      toast.error('Error al cargar intercambios');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleReturn = async (loanId, productId, quantity) => {
    if (!currentUser) return;
    
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-bold text-gray-800 dark:text-white">¿Marcar como devuelto?</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">El stock regresará a tu inventario.</span>
        <div className="flex gap-2 mt-2">
          <button 
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-bold"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const loanRef = doc(db, 'users', currentUser.uid, 'loans', loanId);
                await updateDoc(loanRef, {
                  status: 'Devuelto',
                  dateReturned: new Date()
                });

                const productRef = doc(db, 'users', currentUser.uid, 'products', productId);
                const productSnap = await getDoc(productRef);
                
                let pName = 'Producto Desconocido';
                if (productSnap.exists()) {
                  pName = productSnap.data().name;
                  const currentStock = productSnap.data().stock || 0;
                  await updateDoc(productRef, {
                    stock: currentStock + quantity
                  });
                }
                
                await logHistory(currentUser.uid, {
                  action: 'LOAN_RETURNED',
                  productId,
                  productName: pName,
                  quantity,
                  details: 'Devolución de producto prestado'
                });
                
                toast.success('Intercambio devuelto al stock', { icon: '📦' });
              } catch (error) {
                toast.error("Hubo un error al procesar la devolución.");
              }
            }}
          >
            Confirmar
          </button>
          <button 
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm font-bold"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleDelete = async (loanId) => {
    if (!currentUser) return;
    
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-bold text-gray-800 dark:text-white">¿Eliminar registro?</span>
        <span className="text-sm text-gray-600 dark:text-gray-300">Esto no afectará tu stock actual.</span>
        <div className="flex gap-2 mt-2">
          <button 
            className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-bold"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'loans', loanId));
                toast.success('Registro eliminado');
              } catch (error) {
                toast.error("Error eliminando registro");
              }
            }}
          >
            Eliminar
          </button>
          <button 
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm font-bold"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Reciente';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto transition-colors"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white m-0">Intercambios</h2>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm"
          onClick={() => setIsModalOpen(true)}
        >
          <ArrowRightLeft size={20} />
          <span className="hidden sm:inline">Nuevo Intercambio</span>
        </motion.button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <Loader2 className="animate-spin mb-4 text-slate-300 dark:text-slate-600" size={32} />
          <span>Cargando registro...</span>
        </div>
      ) : loans.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center"
        >
          <ArrowRightLeft size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No hay intercambios activos</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Aquí podrás llevar el control de los productos que le prestes a otras consultoras o los intercambios que realices.
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="flex flex-col gap-4">
          <AnimatePresence>
            {loans.map(loan => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ scale: 1.01 }}
                key={loan.id} 
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-l-4 transition-colors ${loan.status === 'Pendiente' ? 'border-l-orange-500' : 'border-l-emerald-500'}`}
              >
                
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  {loan.productImage ? (
                    <div 
                      className="w-16 h-16 rounded-lg bg-cover bg-center border border-slate-200 dark:border-slate-600 flex-shrink-0"
                      style={{
                        backgroundImage: `url(${loan.productImage})`,
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 text-center flex-shrink-0">
                      Sin foto
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">
                      <span className="text-orange-500 mr-1">{loan.quantity}x</span> {loan.productName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-1">
                      <span>A: <strong className="text-slate-800 dark:text-slate-200">{loan.personName}</strong></span>
                      <span className="flex items-center text-slate-500 dark:text-slate-400">
                        <Clock size={14} className="mr-1" /> 
                        {formatDate(loan.dateLent)}
                      </span>
                    </div>
                    {loan.dueDate && (
                      <div className="mb-1 text-sm">
                        <span className={`font-bold ${loan.status === 'Pendiente' && new Date() > (loan.dueDate.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate)) ? 'text-red-500 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full' : 'text-slate-600 dark:text-slate-400'}`}>
                          Devolución: {formatDate(loan.dueDate)}
                          {loan.status === 'Pendiente' && new Date() > (loan.dueDate.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate)) && ' ⚠️ ¡Vencido!'}
                        </span>
                      </div>
                    )}
                    {loan.notes && (
                      <p className="text-sm italic text-slate-500 dark:text-slate-400 mt-1">"{loan.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 md:pt-0 md:border-t-0 mt-2 md:mt-0">
                  {loan.status === 'Pendiente' ? (
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 border border-orange-500 text-orange-500 rounded-lg text-sm font-bold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      onClick={() => handleReturn(loan.id, loan.productId, loan.quantity)}
                    >
                      Marcar como Devuelto
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Check size={18} />
                      <span>Devuelto</span>
                    </div>
                  )}
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    onClick={() => handleDelete(loan.id)}
                    title="Eliminar registro del historial"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddLoanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </motion.div>
  );
}
