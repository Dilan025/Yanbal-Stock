import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Search, Loader2, MessageCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Catalog() {
  const { uid } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consultantName, setConsultantName] = useState('');
  const [consultantPhone, setConsultantPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [categories, setCategories] = useState(['Todos']);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch consultant name and phone
        const profileRef = doc(db, 'users', uid, 'settings', 'profile');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.name) setConsultantName(data.name);
          else setConsultantName('Consultora Yanbal');
          
          if (data.phone) {
            // Clean phone number (remove spaces, plus sign, etc for wa.me)
            const cleanPhone = data.phone.replace(/\D/g, '');
            setConsultantPhone(cleanPhone);
          }
        } else {
          setConsultantName('Consultora Yanbal');
        }

        // Fetch products with stock > 0
        const q = query(
          collection(db, 'users', uid, 'products'),
          where('stock', '>', 0)
        );
        
        const querySnapshot = await getDocs(q);
        const productsData = [];
        const cats = new Set(['Todos']);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          productsData.push({ id: doc.id, ...data });
          cats.add(data.category);
        });
        
        setProducts(productsData);
        setCategories(Array.from(cats));
      } catch (err) {
        console.error("Error fetching catalog:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      fetchData();
    }
  }, [uid]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsApp = (product) => {
    const text = `¡Hola ${consultantName}! Vengo de tu catálogo virtual. Estoy interesado/a en comprar el producto: *${product.name}* (Precio: S/ ${product.price.toFixed(2)}). ¿Aún lo tienes en stock?`;
    if (consultantPhone) {
      window.open(`https://wa.me/${consultantPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      // Fallback if no phone is registered
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black pb-12 transition-colors">
        <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[280px] animate-pulse">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 w-full"></div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-16 mb-2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-1"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                  </div>
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full mt-3"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full">
          <Info className="text-orange-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Catálogo no disponible</h2>
          <p className="text-gray-600 mb-6">
            No se pudo cargar el catálogo. Asegúrate de que el enlace es correcto y que la consultora tiene los permisos públicos activados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-12 transition-colors">
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-gray-200 dark:border-slate-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 justify-center">
            <img src="/yanbal-logo.svg" alt="Yanbal" className="h-8" onError={(e) => { e.target.style.display='none' }}/>
            <div className="text-xl font-bold text-gray-800 dark:text-white">Yanbal <span className="text-orange-500">Catálogo</span></div>
          </div>
          <div className="text-center">
            <h1 className="font-bold text-gray-800 dark:text-white text-lg">Catálogo de {consultantName}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">¡Mira los productos que tengo en stock para entrega inmediata!</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex overflow-x-auto pb-4 mb-2 gap-2 hide-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${categoryFilter === cat ? 'bg-orange-500 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/50 text-center mt-4">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full mb-6">
              <Package size={64} className="text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No se encontraron productos</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Intenta buscar con otras palabras o selecciona otra categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={product.id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                >
                  {product.imageUrl ? (
                    <div 
                      className="w-full h-40 bg-contain bg-no-repeat bg-center mt-2" 
                      style={{ backgroundImage: `url(${product.imageUrl})` }}
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-50 flex items-center justify-center text-gray-300 mt-2">
                      <Package size={48} />
                    </div>
                  )}
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">{product.category}</span>
                    <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight flex-1">{product.name}</h3>
                    
                    <div className="flex items-center justify-between mt-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                      <span className="font-black text-gray-900">
                        {product.price > 0 ? `S/ ${product.price.toFixed(2)}` : 'Consultar'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        Stock: {product.stock}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleWhatsApp(product)}
                      className="mt-4 w-full py-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <MessageCircle size={16} />
                      Me interesa
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
