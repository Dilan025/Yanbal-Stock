import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Trash2, Edit, Phone, Calendar, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthday: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'users', currentUser.uid, 'clients'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = [];
      snapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() });
      });
      setClients(clientsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenModal = (client = null) => {
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        birthday: client.birthday || '',
        notes: client.notes || ''
      });
      setEditingId(client.id);
    } else {
      setFormData({ name: '', phone: '', birthday: '', notes: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = editingId 
        ? doc(db, 'users', currentUser.uid, 'clients', editingId)
        : doc(collection(db, 'users', currentUser.uid, 'clients'));

      await setDoc(docRef, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        birthday: formData.birthday,
        notes: formData.notes.trim(),
        createdAt: editingId ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(editingId ? 'Cliente actualizado' : 'Cliente guardado');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Error al guardar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!currentUser) return;
    if (window.confirm(`¿Estás seguro de eliminar al cliente "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'clients', id));
        toast.success('Cliente eliminado');
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Users className="text-orange-500" /> Mis Clientes
        </h2>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-slate-400 dark:text-slate-500" size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar cliente por nombre o teléfono..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <Loader2 className="animate-spin mb-2" size={24} />
          <span>Cargando clientes...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
          <Users size={64} className="text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-lg text-slate-500 dark:text-slate-400">No tienes clientes registrados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredClients.map((client) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={client.id} 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 flex flex-col relative group"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">{client.name}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(client)}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                      title="Editar cliente"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id, client.name)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {client.phone && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                    <Phone size={16} />
                    <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition-colors">
                      {client.phone}
                    </a>
                  </div>
                )}
                
                {client.birthday && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                    <Calendar size={16} />
                    <span>{client.birthday}</span>
                  </div>
                )}

                {client.notes && (
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
                    {client.notes}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Agregar/Editar Cliente */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">✕</button>
              </div>
              
              <form onSubmit={handleSave} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cumpleaños</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    value={formData.birthday}
                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Adicionales</label>
                  <textarea
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none h-24"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
