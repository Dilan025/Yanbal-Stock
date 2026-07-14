import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logHistory } from '../utils/history';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function AddLoanModal({ isOpen, onClose }) {
  const [personName, setPersonName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Lista de productos en inventario con stock > 0
  const [inventory, setInventory] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadInventory();
      // Reset form
      setPersonName('');
      setProductId('');
      setQuantity(1);
      setDueDate('');
      setNotes('');
    }
  }, [isOpen]);

  const loadInventory = async () => {
    if (!currentUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'products'));
      const prods = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.stock > 0) {
          prods.push({ id: doc.id, ...data });
        }
      });
      setInventory(prods);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!personName || !productId || quantity < 1) return;

    setLoading(true);
    try {
      // 1. Obtener el producto seleccionado
      const selectedProduct = inventory.find(p => p.id === productId);
      
      if (!selectedProduct) {
        toast.error("Producto no encontrado en inventario.");
        setLoading(false);
        return;
      }

      if (selectedProduct.stock < quantity) {
        toast.error(`No hay suficiente stock. Solo quedan ${selectedProduct.stock} unidades.`);
        setLoading(false);
        return;
      }

      // 2. Crear el registro del préstamo
      await addDoc(collection(db, 'users', currentUser.uid, 'loans'), {
        personName,
        productId,
        productName: selectedProduct.name,
        productImage: selectedProduct.imageUrl || '',
        quantity: parseInt(quantity),
        notes,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`) : null,
        status: 'Pendiente',
        dateLent: serverTimestamp(),
      });

      // 3. Restar del stock general
      const productRef = doc(db, 'users', currentUser.uid, 'products', productId);
      await updateDoc(productRef, {
        stock: selectedProduct.stock - parseInt(quantity)
      });
      
      await logHistory(currentUser.uid, {
        action: 'LOAN_LENT',
        productId,
        productName: selectedProduct.name,
        quantity: parseInt(quantity),
        details: `Prestado a: ${personName}`
      });

      toast.success('Préstamo registrado correctamente');
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error al registrar préstamo:', error);
      toast.error('Hubo un error al registrar el préstamo.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 md:p-8 relative my-8 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white m-0">Nuevo Préstamo</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ¿A quién le prestas?
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  placeholder="Ej: María, Directora Carmen..."
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ¿Qué producto le prestas?
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                >
                  <option value="">Selecciona un producto disponible...</option>
                  {inventory.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (Stock: {prod.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fecha límite de devolución (Opcional)
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas (Opcional)
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm resize-none"
                  placeholder="Ej: Devuelve el viernes, o lo paga en campaña 7"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                />
              </div>

              <div className="flex gap-4 mt-2">
                <button 
                  type="button" 
                  className="flex-1 py-3 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Prestar Producto'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
