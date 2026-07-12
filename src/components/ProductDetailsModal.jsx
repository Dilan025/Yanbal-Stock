import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailsModal({ isOpen, onClose, product, onUpdateStock }) {
  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur-md rounded-full p-2 shadow-sm transition-colors">
                <X size={20} />
              </button>
            </div>

            {product.imageUrl ? (
              <div 
                className="w-full h-48 bg-slate-50 rounded-2xl mb-6 bg-cover bg-center border border-slate-100" 
                style={{ backgroundImage: `url(${product.imageUrl})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}
              />
            ) : (
              <div className="w-full h-48 bg-slate-100 rounded-2xl mb-6 flex items-center justify-center text-slate-400 font-medium">
                Sin imagen
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight">{product.name}</h2>
              <div className="mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${product.stock > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {product.category}
                </span>
              </div>
              <p className="text-slate-500 text-sm">
                Stock: <strong className="text-slate-800 text-lg">{product.stock}</strong> unidades
              </p>
            </div>
            
            {product.price > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">Precio Unitario:</span>
                  <span className="font-semibold text-slate-700">S/ {product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Valor Total:</span>
                  <span className="font-bold text-orange-500 text-lg">S/ {(product.price * product.stock).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-6 mb-6">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm ${product.stock === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                onClick={() => onUpdateStock(product.id, product.stock, -1, product.name)}
                disabled={product.stock === 0}
              >
                <Minus size={22} />
              </motion.button>
              
              <span className="text-3xl font-black text-slate-800 w-12 text-center">{product.stock}</span>
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors shadow-sm"
                onClick={() => onUpdateStock(product.id, product.stock, 1, product.name)}
              >
                <Plus size={22} />
              </motion.button>
            </div>

            <button 
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md text-lg" 
              onClick={onClose}
            >
              Listo
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
