import React from 'react';
import { X, Plus, Minus, Tag, Barcode } from 'lucide-react';
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
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative transition-colors" 
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-md rounded-full p-2 shadow-sm transition-colors">
                <X size={20} />
              </button>
            </div>

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
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Valor Total:</span>
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
