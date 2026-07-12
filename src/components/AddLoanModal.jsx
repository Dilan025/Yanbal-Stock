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
        <div className="modal-overlay" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-content card"
            style={{ padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ margin: 0, textAlign: 'left' }}>Nuevo Préstamo</h2>
              <button onClick={onClose} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label">
              ¿A quién le prestas?
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: María, Directora Carmen..."
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="input-label">
              ¿Qué producto le prestas?
            </label>
            <select
              className="input-field"
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

          <div>
            <label className="input-label">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="input-label">
              Notas (Opcional)
            </label>
            <textarea
              className="input-field"
              style={{ resize: 'none' }}
              placeholder="Ej: Devuelve el viernes, o lo paga en campaña 7"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
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
