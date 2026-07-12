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
      className="page-container container"
    >
      <div className="page-header">
        <h2 className="page-title">Mi Inventario</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="badge badge-success shadow-sm"
          >
            Capital: S/ {totalValue.toFixed(2)}
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="badge badge-warning shadow-sm"
          >
            Productos: {products.length}
          </motion.div>
          <button 
            onClick={() => {
              exportToCSV(products);
              toast.success('Excel descargado');
            }}
            className="btn btn-outline"
            style={{ padding: '0.5rem', borderColor: 'var(--color-border)' }}
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
          className="card"
          style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}
        >
          <div style={{ flex: '1 1 250px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Resumen de Inversión</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Valor total distribuido por categorías en tiempo real.</p>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>S/ {totalValue.toFixed(2)}</div>
          </div>
          <div style={{ flex: '2 1 300px', height: '250px' }}>
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

      <div className="search-section">
        <div className="search-bar">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="category-filters">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`filter-btn ${categoryFilter === cat ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)',
              border: categoryFilter === cat ? 'none' : '1px solid var(--color-border)',
              background: categoryFilter === cat ? 'var(--color-primary)' : 'white',
              color: categoryFilter === cat ? 'white' : 'var(--color-text-muted)',
              transform: categoryFilter === cat ? 'scale(1.05)' : 'none'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="center-content" style={{ padding: '3rem 0', color: 'var(--color-text-muted)' }}>
          <Loader2 className="animate-spin" size={24} style={{ marginBottom: '0.5rem' }} />
          <span>Cargando inventario...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card center-content"
          style={{ padding: '3rem', border: '2px dashed var(--color-border)', backgroundColor: 'transparent', boxShadow: 'none' }}
        >
          <Package size={64} style={{ color: 'var(--color-border)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>No se encontraron productos.</p>
        </motion.div>
      ) : (
        <motion.div layout className="products-grid">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                key={product.id} 
                className="card product-card group"
              >
                <button 
                  onClick={() => handleDeleteProduct(product.id, product.name, product.stock)}
                  className="delete-btn"
                  title="Eliminar producto"
                >
                  <Trash2 size={16} />
                </button>
                {product.imageUrl ? (
                  <div 
                    className="product-card-image" 
                    onClick={() => setSelectedProduct(product)}
                    style={{ backgroundImage: `url(${product.imageUrl})`, cursor: 'pointer' }}
                  />
                ) : (
                  <div className="product-card-placeholder" onClick={() => setSelectedProduct(product)} style={{ cursor: 'pointer' }}>
                    <Package size={48} />
                  </div>
                )}
                
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedProduct(product)}>
                  <div className="product-card-header">
                    <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-danger'} shadow-sm`}>
                      {product.category}
                    </span>
                    {product.price > 0 && (
                      <span className="product-card-price">
                        S/ {product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <h3 className="product-card-title">{product.name}</h3>
                  <p className="product-card-stock">
                    Stock disponible: <strong style={{ color: product.stock === 0 ? '#EF4444' : 'var(--color-secondary)', fontSize: '1.25rem', marginLeft: '0.25rem' }}>{product.stock}</strong>
                  </p>
                </div>
                
                <div className="product-card-controls">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="control-btn minus"
                    onClick={() => handleUpdateStock(product.id, product.stock, -1, product.name)}
                    disabled={product.stock === 0}
                  >
                    <Minus size={18} />
                  </motion.button>
                  
                  <span>{product.stock}</span>
                  
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="control-btn plus"
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
