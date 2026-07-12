import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailsModal({ isOpen, onClose, product, onUpdateStock }) {
  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="modal-content card" 
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '380px', padding: '1.25rem', position: 'relative' }}
          >
            <div className="modal-header">
              <button onClick={onClose} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            {product.imageUrl ? (
              <div 
                className="modal-product-image" 
                style={{ backgroundImage: `url(${product.imageUrl})` }}
              />
            ) : (
              <div className="modal-product-placeholder">
                Sin imagen
              </div>
            )}

            <h2 className="modal-product-title">{product.name}</h2>
            <div className="modal-product-category">
              <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-danger'} shadow-sm`}>
                {product.category}
              </span>
            </div>
            
            <p className="modal-product-stock">
              Stock: <strong>{product.stock}</strong> unidades
            </p>
            
            {product.price > 0 && (
              <div className="modal-price-box">
                <div className="modal-price-row">
                  <span className="modal-price-label">Precio Unitario:</span>
                  <span className="modal-price-value">S/ {product.price.toFixed(2)}</span>
                </div>
                <div className="modal-price-row">
                  <span className="modal-price-label">Valor Total:</span>
                  <span className="modal-price-value total">S/ {(product.price * product.stock).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="modal-stock-controls">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="control-btn minus"
                onClick={() => onUpdateStock(product.id, product.stock, -1, product.name)}
                disabled={product.stock === 0}
              >
                <Minus size={22} />
              </motion.button>
              
              <span>{product.stock}</span>
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="control-btn plus"
                onClick={() => onUpdateStock(product.id, product.stock, 1, product.name)}
              >
                <Plus size={22} />
              </motion.button>
            </div>

            <button className="modal-submit-btn" onClick={onClose}>
              Listo
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
