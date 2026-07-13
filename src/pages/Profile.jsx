import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { User, Phone, Save, Loader2 } from 'lucide-react';

export default function Profile() {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid, "settings", "profile"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setPhone(data.phone || '');
        }
      } catch (err) {
        toast.error("Error al cargar perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid, "settings", "profile"), {
        name: name.trim(),
        phone: phone.trim()
      }, { merge: true });
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      toast.error("Error al guardar perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Mi Perfil</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 max-w-lg">
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
          Actualiza tus datos para que los clientes puedan ver tu nombre y contactarte por WhatsApp desde tu catálogo virtual.
        </p>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre de Consultora
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Tu nombre y apellido"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Número de WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Ej: +51 987654321"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Guardar Cambios</span>
          </button>
        </form>
      </div>
    </div>
  );
}
