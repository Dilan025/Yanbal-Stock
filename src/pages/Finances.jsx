import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, Package } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function Finances() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'users', currentUser.uid, 'sales'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = [];
      snapshot.forEach((doc) => {
        salesData.push({ id: doc.id, ...doc.data() });
      });
      setSales(salesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const { totalRevenue, totalProfit, monthlyData, topProducts } = useMemo(() => {
    let revenue = 0;
    let profit = 0;
    const monthly = {};
    const productCounts = {};

    sales.forEach(sale => {
      revenue += sale.total;
      profit += sale.total - (sale.costPerUnit * sale.quantity);

      // Agrupar por mes
      const date = sale.date?.toDate ? sale.date.toDate() : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthly[monthKey]) {
        monthly[monthKey] = { name: monthKey, Ventas: 0, Ganancia: 0 };
      }
      monthly[monthKey].Ventas += sale.total;
      monthly[monthKey].Ganancia += sale.total - (sale.costPerUnit * sale.quantity);

      // Productos más vendidos
      if (!productCounts[sale.productName]) {
        productCounts[sale.productName] = { name: sale.productName, qty: 0, revenue: 0 };
      }
      productCounts[sale.productName].qty += sale.quantity;
      productCounts[sale.productName].revenue += sale.total;
    });

    // Sort months chronologically
    const sortedMonthlyData = Object.values(monthly).sort((a, b) => a.name.localeCompare(b.name));
    
    // Sort top products by quantity
    const sortedProducts = Object.values(productCounts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { totalRevenue: revenue, totalProfit: profit, monthlyData: sortedMonthlyData, topProducts: sortedProducts };
  }, [sales]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
        <span className="text-slate-500 font-medium">Cargando datos financieros...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <DollarSign className="text-emerald-500" /> Finanzas y Ventas
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ingresos Totales (Ventas)</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">S/ {totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
            <DollarSign size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ganancia Estimada</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">S/ {totalProfit.toFixed(2)}</h3>
            <p className="text-xs text-slate-400 mt-1">Calculado sobre el precio de catálogo de los productos.</p>
          </div>
        </div>
      </div>

      {monthlyData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-orange-500" /> 
              Ventas por Mes
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Ventas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ganancia" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Package size={20} className="text-orange-500" /> 
              Más Vendidos
            </h3>
            <div className="flex flex-col gap-4">
              {topProducts.map((p, index) => (
                <div key={index} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.qty} unidades</p>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    S/ {p.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
          <DollarSign size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Aún no hay ventas</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Cuando presiones el botón "Vender Producto" en los detalles de tu inventario, aquí aparecerán tus estadísticas de ingresos y ganancias.
          </p>
        </div>
      )}
    </motion.div>
  );
}
