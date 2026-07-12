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
      toast.error('Error al cargar préstamos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleReturn = async (loanId, productId, quantity) => {
    if (!currentUser) return;
    
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-bold text-gray-800">¿Marcar como devuelto?</span>
        <span className="text-sm text-gray-600">El stock regresará a tu inventario.</span>
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
                
                toast.success('Préstamo devuelto al stock', { icon: '📦' });
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
        <span className="font-bold text-gray-800">¿Eliminar registro?</span>
        <span className="text-sm text-gray-600">Esto no afectará tu stock actual.</span>
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
      className="container"
      style={{ position: 'relative' }}
    >
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.025em' }}>Préstamos e Intercambios</h2>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary btn-icon-text"
          onClick={() => setIsModalOpen(true)}
        >
          <ArrowRightLeft size={20} />
          <span className="hide-mobile">Nuevo Préstamo</span>
        </motion.button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
          <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem' }} />
          <span>Cargando registro...</span>
        </div>
      ) : loans.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card"
          style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)', backgroundColor: 'transparent', boxShadow: 'none' }}
        >
          <ArrowRightLeft size={64} style={{ margin: '0 auto 1rem', color: '#D1D5DB' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#374151' }}>No hay préstamos activos</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Aquí podrás llevar el control de los productos que le prestes a otras consultoras o los intercambios que realices.
          </p>
        </motion.div>
      ) : (
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {loans.map(loan => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ scale: 1.01 }}
                key={loan.id} 
                className="card loan-card"
                style={{ borderLeft: `4px solid ${loan.status === 'Pendiente' ? 'var(--color-primary)' : 'var(--color-success)'}` }}
              >
                
                <div className="loan-info">
                  {loan.productImage ? (
                    <div 
                      className="loan-image"
                      style={{
                        backgroundImage: `url(${loan.productImage})`,
                      }}
                    />
                  ) : (
                    <div className="loan-image-placeholder">
                      Sin foto
                    </div>
                  )}
                  
                  <div>
                    <h3 className="loan-title">
                      <span>{loan.quantity}x</span> {loan.productName}
                    </h3>
                    <div className="loan-meta">
                      <span>A: <strong>{loan.personName}</strong></span>
                      <span className="loan-date">
                        <Clock size={14} /> 
                        {formatDate(loan.dateLent)}
                      </span>
                    </div>
                    {loan.notes && (
                      <p className="loan-notes">"{loan.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="loan-actions">
                  {loan.status === 'Pendiente' ? (
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-outline"
                      style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      onClick={() => handleReturn(loan.id, loan.productId, loan.quantity)}
                    >
                      Marcar como Devuelto
                    </motion.button>
                  ) : (
                    <div className="loan-status-returned">
                      <Check size={18} />
                      <span>Devuelto</span>
                    </div>
                  )}
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="loan-delete-btn"
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
