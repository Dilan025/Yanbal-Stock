import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Package, Loader2, Trash2, Download } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { logHistory } from '../utils/history';
import { exportToCSV } from '../utils/exportData';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#FF5E00', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'users', currentUser.uid, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);
      setLoading(false);
      
      if (selectedProduct) {
        const updatedSelected = productsData.find(p => p.id === selectedProduct.id);
        if (updatedSelected) {
          setSelectedProduct(updatedSelected);
        } else {
          setSelectedProduct(null);
        }
      }
    }, (error) => {
      console.error("Error al cargar productos:", error);
      toast.error("Error al cargar inventario");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProduct, currentUser]);

  const handleUpdateStock = async (id, currentStock, change, productName) => {
    if (!currentUser) return;
    const newStock = currentStock + change;
    if (newStock < 0) return;
    
    try {
      const productRef = doc(db, 'users', currentUser.uid, 'products', id);
      await updateDoc(productRef, {
        stock: newStock
      });
      
      await logHistory(currentUser.uid, {
        action: change > 0 ? 'STOCK_UP' : 'STOCK_DOWN',
        productId: id,
        productName: productName,
        quantity: Math.abs(change),
        details: `Stock actualizado de ${currentStock} a ${newStock}`
      });
      
      toast.success(change > 0 ? '+1 agregado' : '-1 retirado', {
        icon: change > 0 ? '📈' : '📉',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
    } catch (error) {
      toast.error("Error actualizando stock");
    }
  };

  const handleDeleteProduct = async (id, name, currentStock) => {
    if (!currentUser) return;
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-bold text-gray-800">¿Eliminar "{name}"?</span>
        <span className="text-sm text-gray-600">Esta acción no se puede deshacer.</span>
        <div className="flex gap-2 mt-2">
          <button 
            className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-bold"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'products', id));
                await logHistory(currentUser.uid, {
                  action: 'DELETE_PRODUCT',
                  productId: id,
                  productName: name,
                  quantity: currentStock,
                  details: 'Producto eliminado del inventario'
                });
                toast.success('Producto eliminado');
              } catch (error) {
                toast.error('No se pudo eliminar');
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = products.reduce((acc, product) => acc + (product.stock * (product.price || 0)), 0);
  const categories = ['Todos', ...new Set(products.map(p => p.category))];

  // Datos para el gráfico
  const chartData = useMemo(() => {
    const dataMap = {};
    products.forEach(p => {
      const val = p.stock * (p.price || 0);
      if (val > 0) {
        if (!dataMap[p.category]) dataMap[p.category] = 0;
        dataMap[p.category] += val;
      }
    });
    return Object.keys(dataMap).map(key => ({ name: key, value: dataMap[key] }));
  }, [products]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Mi Inventario</h2>
        <div className="flex flex-wrap items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
          >
            Capital: S/ {totalValue.toFixed(2)}
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
          >
            Productos: {products.length}
          </motion.div>
          <button 
            onClick={() => {
              exportToCSV(products);
              toast.success('Excel descargado');
            }}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Exportar a Excel"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-wrap gap-6 items-center"
        >
          <div className="flex-1 min-w-[250px]">
            <h3 className="text-lg font-bold text-slate-700 mb-2">Resumen de Inversión</h3>
            <p className="text-sm text-slate-500 mb-4">Valor total distribuido por categorías en tiempo real.</p>
            <div className="text-3xl font-bold text-orange-500">S/ {totalValue.toFixed(2)}</div>
          </div>
          <div className="flex-[2] min-w-[300px] h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex overflow-x-auto pb-4 mb-2 gap-2 hide-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${categoryFilter === cat ? 'bg-orange-500 text-white scale-105 border-transparent' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin mb-2" size={24} />
          <span>Cargando inventario...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 rounded-xl"
        >
          <Package size={64} className="text-slate-300 mb-4" />
          <p className="text-lg text-slate-500">No se encontraron productos.</p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                key={product.id} 
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group"
              >
                <button 
                  onClick={() => handleDeleteProduct(product.id, product.name, product.stock)}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-red-500 hover:text-white text-slate-400 p-1.5 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                  title="Eliminar producto"
                >
                  <Trash2 size={16} />
                </button>
                {product.imageUrl ? (
                  <div 
                    className="h-48 bg-cover bg-center cursor-pointer" 
                    onClick={() => setSelectedProduct(product)}
                    style={{ backgroundImage: `url(${product.imageUrl})` }}
                  />
                ) : (
                  <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-300 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <Package size={48} />
                  </div>
                )}
                
                <div className="p-4 flex-1 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {product.category}
                    </span>
                    {product.price > 0 && (
                      <span className="font-bold text-slate-700">
                        S/ {product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight">{product.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    Stock disponible: <strong className={`text-xl ${product.stock === 0 ? 'text-red-500' : 'text-slate-700'}`}>{product.stock}</strong>
                  </p>
                </div>
                
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => handleUpdateStock(product.id, product.stock, -1, product.name)}
                    disabled={product.stock === 0}
                  >
                    <Minus size={18} />
                  </motion.button>
                  
                  <span className="font-bold text-lg text-slate-700">{product.stock}</span>
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    onClick={() => handleUpdateStock(product.id, product.stock, 1, product.name)}
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct}
        onUpdateStock={handleUpdateStock}
      />
    </motion.div>
  );
}
