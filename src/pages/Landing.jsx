import React from 'react';
import { Package, Smartphone, Users, Zap, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing({ onLoginClick, onRegisterClick }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-sans overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Package size={24} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">YanbalStock</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onLoginClick}
            className="text-slate-600 dark:text-slate-300 font-medium hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          >
            Iniciar Sesión
          </button>
          <button 
            onClick={onRegisterClick}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full font-bold shadow-md shadow-orange-500/20 transition-all hover:-translate-y-0.5"
          >
            Registrarse
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center mt-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/10 dark:bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block py-1.5 px-4 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm mb-6 border border-orange-200 dark:border-orange-800">
            ✨ La mejor herramienta para Consultoras
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight max-w-4xl mx-auto">
            Gestiona tu inventario con <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">inteligencia</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Escanea códigos de barras, controla tus intercambios y prestaciones, mantén tu stock al día y comparte tu catálogo virtual con clientes en segundos. Todo desde tu celular o computadora.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onRegisterClick}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Empezar Gratis <ChevronRight size={20} />
            </button>
            <button 
              onClick={onLoginClick}
              className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-8 py-4 rounded-full font-bold text-lg transition-all"
            >
              Ya tengo una cuenta
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 dark:bg-slate-800/50 py-24 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para tu negocio</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Diseñado específicamente para consultoras de belleza.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap size={32} />}
              title="Escáner Rápido"
              desc="Agrega productos al instante usando la cámara de tu celular. Nuestra base de datos global autocompleta la información por ti."
              color="text-orange-500"
              bg="bg-orange-100 dark:bg-orange-900/30"
            />
            <FeatureCard 
              icon={<Users size={32} />}
              title="Catálogo Compartible"
              desc="Envía un enlace único por WhatsApp a tus clientes para que vean tus productos disponibles y te hagan pedidos directamente."
              color="text-emerald-500"
              bg="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <FeatureCard 
              icon={<Shield size={32} />}
              title="Intercambios y Prestaciones"
              desc="Lleva un registro de qué producto prestaste o intercambiaste, con alertas de fecha de vencimiento para que nunca pierdas mercadería."
              color="text-blue-500"
              bg="bg-blue-100 dark:bg-blue-900/30"
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Yanbal Stock. Creado para potenciar tu negocio.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, bg }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 text-left"
    >
      <div className={`w-16 h-16 rounded-2xl ${bg} ${color} flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
