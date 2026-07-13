import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Tag, Barcode, ShoppingCart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { logHistory } from '../utils/history';

export default function ProductDetailsModal({ isOpen, onClose, product, onUpdateStock, onEditClick }) {
  const { currentUser } = useAuth();
  const [isSelling, setIsSelling] = useState(false);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPrice, setSellPrice] = useState(0);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (product) {
      setSellPrice(product.price || 0);
      setSellQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!currentUser || !isSelling) return;
      try {
        const q = query(collection(db, 'users', currentUser.uid, 'clients'));
        const snap = await getDocs(q);
        const clientsData = [];
        snap.forEach(doc => clientsData.push({ id: doc.id, ...doc.data() }));
        setClients(clientsData);
      } catch (e) {
        console.error("Error fetching clients", e);
      }
    };
    fetchClients();
  }, [currentUser, isSelling]);

  const handleSell = async () => {
    if (!currentUser || !product) return;
    if (sellQuantity > product.stock) {
      toast.error('No hay suficiente stock');
      return;
    }

    setIsProcessing(true);
    try {
      const newStock = product.stock - sellQuantity;
      
      // Update product stock
      const productRef = doc(db, 'users', currentUser.uid, 'products', product.id);
      await updateDoc(productRef, { stock: newStock });

      // Record Sale
      const saleRef = doc(collection(db, 'users', currentUser.uid, 'sales'));
      await setDoc(saleRef, {
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: sellQuantity,
        pricePerUnit: sellPrice,
        total: sellQuantity * sellPrice,
        costPerUnit: product.price || 0, // Using catalog price as a baseline reference
        clientId: selectedClient || null,
        date: serverTimestamp()
      });

      // Log history
      await logHistory(currentUser.uid, {
        action: 'SELL',
        productId: product.id,
        productName: product.name,
        quantity: sellQuantity,
        details: `Venta de ${sellQuantity} unds. a S/ ${sellPrice.toFixed(2)} c/u.`
      });

      toast.success('¡Venta registrada con éxito!');
      setIsSelling(false);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transition-colors" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => isSelling ? setIsSelling(false) : onClose()} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-md rounded-full p-2 shadow-sm transition-colors">
                <X size={20} />
              </button>
            </div>

            {isSelling ? (
              <div className="flex flex-col h-full">
                <div className="text-center mb-6 mt-4">
                  <ShoppingCart className="mx-auto text-emerald-500 mb-2" size={40} />
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Registrar Venta</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{product.name}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad a vender (Stock: {product.stock})</label>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setSellQuantity(Math.max(1, sellQuantity - 1))}
                        className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300"
                      ><Minus size={16}/></button>
                      <input 
                        type="number" 
                        min="1" 
                        max={product.stock}
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white"
                      />
                      <button 
                        type="button"
                        onClick={() => setSellQuantity(Math.min(product.stock, sellQuantity + 1))}
                        className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300"
                      ><Plus size={16}/></button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Unitario de Venta (S/)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                      className="w-full font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente (Opcional)</label>
                    <select 
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-white"
                    >
                      <option value="">-- Sin cliente específico --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 mt-2">
                    <div className="flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-400">
                      <span>Total Venta:</span>
                      <span className="text-xl">S/ {(sellQuantity * sellPrice).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={handleSell}
                    disabled={isProcessing}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-md text-lg flex justify-center items-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Venta'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {product.imageUrl ? (
                  <div 
                    className="w-full h-48 bg-slate-50 dark:bg-slate-700 rounded-2xl mb-6 bg-cover bg-center border border-slate-100 dark:border-slate-600" 
                    style={{ backgroundImage: `url(${product.imageUrl})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}
                  />
                ) : (
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 rounded-2xl mb-6 flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">
                    Sin imagen
                  </div>
                )}

                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 leading-tight">{product.name}</h2>
                  <div className="mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${product.stock > 0 ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'}`}>
                      {product.category}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm gap-2">
                    <span>Stock actual:</span>
                    <strong className="text-slate-800 dark:text-white text-lg">{product.stock}</strong> unidades
                  </div>

                  {(product.campaign || product.barcode || product.variant) && (
                    <div className="flex justify-center flex-wrap gap-4 mt-2">
                      {product.variant && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                          <Tag size={12} />
                          Tono: {product.variant}
                        </div>
                      )}
                      {product.campaign && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                          <Tag size={12} />
                          {product.campaign}
                        </div>
                      )}
                      {product.barcode && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                          <Barcode size={12} />
                          {product.barcode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {product.price > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl p-4 mb-6 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Precio Unitario:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">S/ {product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Valor Total (Catálogo):</span>
                      <span className="font-bold text-orange-500 dark:text-orange-400 text-lg">S/ {(product.price * product.stock).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-6 mb-6">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${product.stock === 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50'}`}
                    onClick={() => onUpdateStock(product.id, product.stock, -1, product.name)}
                    disabled={product.stock === 0}
                  >
                    <Minus size={22} />
                  </motion.button>
                  
                  <span className="text-3xl font-black text-slate-800 dark:text-white w-12 text-center">{product.stock}</span>
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 flex items-center justify-center transition-colors shadow-sm"
                    onClick={() => onUpdateStock(product.id, product.stock, 1, product.name)}
                  >
                    <Plus size={22} />
                  </motion.button>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-md text-lg disabled:opacity-50" 
                    onClick={() => setIsSelling(true)}
                    disabled={product.stock === 0}
                  >
                    Vender Producto
                  </button>
                  <div className="flex gap-3">
                    <button 
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors shadow-sm" 
                      onClick={() => {
                        if (onEditClick) onEditClick(product);
                        onClose();
                      }}
                    >
                      Editar
                    </button>
                    <button 
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-sm" 
                      onClick={onClose}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
