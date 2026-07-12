import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Search } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import catalog from '../data/catalog.json';
import { logHistory } from '../utils/history';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function AddProductModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Maquillaje');
  const [stock, setStock] = useState(1);
  const [price, setPrice] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (name.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = catalog.filter(p => 
      p.name.toLowerCase().includes(name.toLowerCase())
    );
    setSuggestions(filtered);
  }, [name]);

  const handleSelectProduct = (product) => {
    setName(product.name);
    setCategory(product.category);
    setShowSuggestions(false);
    
    // Check if the image url is base64 or a real URL. 
    // Since we scraped real URLs, we just save the URL if it's from the catalog
    // But we need to make sure we don't overwrite if they want to upload their own
    // Actually, we can fetch and convert it to base64, or just save the URL directly!
    // Since Firestore doesn't care, we just save product.imageUrl
    setImageBase64(product.imageUrl);
  };

  if (!isOpen) return null;

  // Función para comprimir y convertir la imagen a texto (Base64)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageBase64(dataUrl);
      };
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'products'), {
        name,
        category,
        stock: parseInt(stock, 10),
        price: parseFloat(price) || 0,
        imageUrl: imageBase64,
        createdAt: serverTimestamp()
      });
      
      await logHistory(currentUser.uid, {
        action: 'ADD_PRODUCT',
        productId: docRef.id,
        productName: name,
        quantity: parseInt(stock, 10),
        details: `Nuevo producto agregado (Stock inicial: ${stock})`
      });

      setName('');
      setCategory('Maquillaje');
      setStock(1);
      setPrice('');
      setImageBase64('');
      toast.success('Producto agregado con éxito');
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Hubo un error al guardar el producto.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-content card" 
            style={{ overflow: 'visible', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ margin: 0, textAlign: 'left' }}>Nuevo Producto</h2>
              <button onClick={onClose} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="image-upload-container text-center">
            <input 
              type="file" 
              id="productImage" 
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleImageChange}
            />
            <label 
              htmlFor="productImage" 
              className={`image-upload-box ${imageBase64 ? 'has-image' : ''}`}
              style={imageBase64 ? { backgroundImage: `url(${imageBase64})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
            >
              {!imageBase64 && (
                <div className="upload-placeholder">
                  <Upload size={32} style={{ margin: '0 auto 0.5rem', color: '#9CA3AF' }} />
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Toca para subir foto</span>
                </div>
              )}
            </label>
          </div>

          <div className="input-group relative">
            <label className="input-label">Buscar producto en el catálogo</label>
            <div className="search-bar">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Empieza a escribir... (Ej. Ohm)"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                required
              />
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <ul style={{ position: 'absolute', zIndex: 50, width: '100%', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', maxHeight: '240px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', top: '100%', left: 0, listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                {suggestions.map((p, index) => (
                  <li 
                    key={index}
                    style={{ padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff7ed'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    onClick={() => handleSelectProduct(p)}
                  >
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px' }} />}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: '#1f2937' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: '#f97316' }}>{p.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Categoría</label>
              <select 
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Maquillaje">Maquillaje</option>
                <option value="Tratamiento Facial">Tratamiento Facial</option>
                <option value="Cuidado Personal">Cuidado Personal</option>
                <option value="Perfumes">Perfumes</option>
                <option value="Joyería">Joyería</option>
                <option value="Hombres">Hombres</option>
                <option value="Niños y Bebés">Niños y Bebés</option>
                <option value="Protección Solar">Protección Solar</option>
              </select>
            </div>
            
            <div className="input-group" style={{ width: '100px' }}>
              <label className="input-label">Precio (S/)</label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                style={{ textAlign: 'center' }}
                placeholder="0.00"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            
            <div className="input-group" style={{ width: '100px' }}>
              <label className="input-label">Stock</label>
              <input
                type="number"
                className="input-field"
                style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.125rem' }}
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Producto (Stock: ' + stock + ')'}
            </button>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
