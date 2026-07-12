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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 relative my-8" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Nuevo Producto</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          <div className="text-center">
            <input 
              type="file" 
              id="productImage" 
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            <label 
              htmlFor="productImage" 
              className={`block w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${imageBase64 ? 'border-transparent bg-slate-50' : 'border-slate-300 hover:border-orange-400 bg-slate-50 hover:bg-orange-50'}`}
              style={imageBase64 ? { backgroundImage: `url(${imageBase64})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
            >
              {!imageBase64 && (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Upload size={32} className="mb-2 text-slate-400" />
                  <span className="text-sm font-medium">Toca para subir foto</span>
                </div>
              )}
            </label>
          </div>

          <div className="relative flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">Buscar producto en el catálogo</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
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
              <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg top-full left-0 list-none p-0">
                {suggestions.map((p, index) => (
                  <li 
                    key={index}
                    className="p-3 cursor-pointer flex items-center gap-3 border-b border-slate-50 hover:bg-orange-50 transition-colors"
                    onClick={() => handleSelectProduct(p)}
                  >
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain rounded" />}
                    <div>
                      <div className="font-medium text-sm text-slate-800">{p.name}</div>
                      <div className="text-xs text-orange-500">{p.category}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <select 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
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
            
            <div className="w-24 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Precio (S/)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-2 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                placeholder="0.00"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            
            <div className="w-20 flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                className="w-full px-2 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-bold text-lg"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="mt-4 w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
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
