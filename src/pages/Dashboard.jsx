import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Package, Loader2, Trash2, Download, MessageCircle, AlertTriangle, Camera } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ProductDetailsModal from '../components/ProductDetailsModal';
import AddProductModal from '../components/AddProductModal';
import { logHistory } from '../utils/history';
import { exportToCSV } from '../utils/exportData';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import QuickScanModal from '../components/QuickScanModal';

const COLORS = ['#FF5E00', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'];

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [campaignFilter, setCampaignFilter] = useState('Todas');
  const [showLowStock, setShowLowStock] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
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

  const handleExportWhatsApp = () => {
    let text = "*Inventario Yanbal*\n\n";
    const categories = {};
    filteredProducts.forEach(p => {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    });

    Object.keys(categories).forEach(cat => {
      text += `*${cat}*\n`;
      categories[cat].forEach(p => {
        text += `- ${p.name}: ${p.stock} unid.`;
        if (p.price > 0) text += ` (S/ ${p.price})`;
        text += `\n`;
      });
      text += `\n`;
    });

    text += `*Total Productos:* ${filteredProducts.length}\n`;
    text += `*Valor Estimado:* S/ ${totalValue.toFixed(2)}\n`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    const matchesCampaign = campaignFilter === 'Todas' || product.campaign === campaignFilter;
    const matchesLowStock = !showLowStock || product.stock <= 2;
    return matchesSearch && matchesCategory && matchesCampaign && matchesLowStock;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchTerm, categoryFilter, campaignFilter, showLowStock]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const totalValue = filteredProducts.reduce((acc, product) => acc + (product.stock * (product.price || 0)), 0);
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const campaigns = ['Todas', ...new Set(products.map(p => p.campaign).filter(Boolean))];

  const chartData = useMemo(() => {
    const dataMap = {};
    filteredProducts.forEach(p => {
      const val = p.stock * (p.price || 0);
      if (val > 0) {
        if (!dataMap[p.category]) dataMap[p.category] = 0;
        dataMap[p.category] += val;
      }
    });
    return Object.keys(dataMap).map(key => ({ name: key, value: dataMap[key] }));
  }, [filteredProducts]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Mi Inventario</h2>
        <div className="flex flex-wrap items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
          >
            Capital: S/ {totalValue.toFixed(2)}
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm"
          >
            Productos: {products.length}
          </motion.div>
          
          <button 
            onClick={() => setShowLowStock(!showLowStock)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${showLowStock ? 'bg-red-500 text-white shadow-sm' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title="Filtrar Stock Bajo"
          >
            <AlertTriangle size={20} />
            <span className="text-sm font-bold">Alertas</span>
          </button>

          <button 
            onClick={handleExportWhatsApp}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
            title="Compartir por WhatsApp"
          >
            <MessageCircle size={20} />
            <span className="text-sm font-bold">Compartir</span>
          </button>
          
          <button 
            onClick={() => setIsQuickScanOpen(true)}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-2"
            title="Escáner Rápido"
          >
            <Camera size={20} />
            <span className="text-sm font-bold">Escáner</span>
          </button>

          <button 
            onClick={() => {
              const url = `${window.location.origin}/catalog/${currentUser?.uid}`;
              navigator.clipboard.writeText(url);
              toast.success('Enlace de catálogo copiado');
            }}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2"
            title="Copiar enlace del Catálogo Público"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            <span className="text-sm font-bold">Enlace</span>
          </button>

          <button 
            onClick={() => {
              exportToCSV(products);
              toast.success('Excel descargado');
            }}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            title="Exportar a Excel"
          >
            <Download size={20} />
            <span className="text-sm font-bold">Excel</span>
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8 flex flex-wrap gap-6 items-center transition-colors"
        >
          <div className="flex-1 min-w-[250px]">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Resumen de Inversión</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Valor total distribuido por categorías en tiempo real.</p>
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
                <Tooltip formatter={(value) => `S/ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-slate-400 dark:text-slate-500" size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar w-full sm:w-auto">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${categoryFilter === cat ? 'bg-orange-500 text-white scale-105 border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {campaigns.length > 1 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Campaña:</label>
            <select 
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2 font-bold shadow-sm"
            >
              {campaigns.map(camp => (
                <option key={camp} value={camp}>{camp}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[320px] animate-pulse">
              <div className="h-36 bg-slate-200 dark:bg-slate-700 w-full mt-4"></div>
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-16"></div>
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4 mb-2 mt-4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2 mt-3"></div>
              </div>
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                 <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                 <div className="h-6 w-10 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                 <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/50 text-center"
        >
          <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full mb-6">
            <Package size={64} className="text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Tu inventario está vacío</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            Comienza a administrar tu negocio agregando tu primer producto. ¡Usa el catálogo colaborativo para hacerlo en segundos!
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            <AnimatePresence>
              {visibleProducts.map((product) => {
                const isLowStock = product.stock > 0 && product.stock <= 2;
                const isOutOfStock = product.stock === 0;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                  key={product.id} 
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border ${isOutOfStock ? 'border-red-300 dark:border-red-800' : isLowStock ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'} overflow-hidden flex flex-col relative group transition-colors`}
                >
                  {isLowStock && (
                    <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                      STOCK BAJO
                    </div>
                  )}

                  <button 
                    onClick={() => handleDeleteProduct(product.id, product.name, product.stock)}
                    className="absolute top-2 right-2 bg-white/80 dark:bg-slate-900/80 hover:bg-red-500 hover:text-white text-slate-400 p-1.5 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                  {product.imageUrl ? (
                    <div 
                      className="h-28 md:h-36 bg-contain bg-no-repeat bg-center cursor-pointer mt-4" 
                      onClick={() => setSelectedProduct(product)}
                      style={{ backgroundImage: `url(${product.imageUrl})` }}
                    />
                  ) : (
                    <div className="h-28 md:h-36 mt-4 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-500 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      <Package size={40} className="md:w-12 md:h-12" />
                    </div>
                  )}
                  
                  <div className="p-3 md:p-4 flex-1 cursor-pointer flex flex-col" onClick={() => setSelectedProduct(product)}>
                    <div className="flex justify-between items-start mb-2 gap-1">
                      <span className={`px-1.5 py-0.5 md:px-2 md:py-1 text-[9px] md:text-xs font-bold rounded-full truncate ${product.stock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'}`}>
                        {product.category}
                      </span>
                      {product.price > 0 && (
                        <span className="font-bold text-xs md:text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          S/ {product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-lg mb-1 leading-tight flex-1">{product.name}</h3>
                    {product.variant && (
                      <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 truncate">
                        Tono: {product.variant}
                      </p>
                    )}
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-2">
                      Stock: <strong className={`text-base md:text-xl ${product.stock === 0 ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'}`}>{product.stock}</strong>
                    </p>
                  </div>
                  
                  <div className="px-2 md:px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                      onClick={() => handleUpdateStock(product.id, product.stock, -1, product.name)}
                      disabled={product.stock === 0}
                    >
                      <Minus size={14} className="md:w-4 md:h-4" />
                    </motion.button>
                    
                    <span className="font-bold text-base md:text-lg text-slate-700 dark:text-white">{product.stock}</span>
                    
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      onClick={() => handleUpdateStock(product.id, product.stock, 1, product.name)}
                    >
                      <Plus size={14} className="md:w-4 md:h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          </motion.div>
          {visibleCount < filteredProducts.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-600 dark:text-orange-400 font-bold py-3 px-8 rounded-full transition-colors shadow-sm"
              >
                Cargar más productos
              </button>
            </div>
          )}
        </>
      )}

      <ProductDetailsModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct}
        onUpdateStock={handleUpdateStock}
        onEditClick={(product) => setEditingProduct(product)}
      />
      
      <AddProductModal 
        isOpen={!!editingProduct} 
        onClose={() => setEditingProduct(null)} 
        productToEdit={editingProduct} 
      />

      <QuickScanModal
        isOpen={isQuickScanOpen}
        onClose={() => setIsQuickScanOpen(false)}
        products={products}
        onUpdateStock={handleUpdateStock}
        onProductNotFound={(barcode) => {
          setQuickAddBarcode(barcode);
          setIsQuickAddOpen(true);
        }}
      />
      
      <AddProductModal 
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setQuickAddBarcode('');
        }}
        initialBarcode={quickAddBarcode}
      />
    </motion.div>
  );
}
