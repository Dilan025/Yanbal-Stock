import React, { useState } from 'react';
import { X, FileText, Loader2, CheckCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logHistory } from '../utils/history';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function ImportInvoiceModal({ isOpen, onClose }) {
  const [invoiceText, setInvoiceText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [step, setStep] = useState(1);
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  const handleParse = () => {
    if (!invoiceText.trim()) {
      toast.error("Pega el texto de la factura primero");
      return;
    }
    
    // Very basic parsing heuristic
    // Assumes lines like: "1 OHM PARFUM 120.00" or "OHM PARFUM 2"
    const lines = invoiceText.split('\n').filter(l => l.trim().length > 0);
    const products = [];

    lines.forEach(line => {
      let stock = 1;
      let name = line.trim();
      let price = 0;

      // Extract numbers that might be quantities or prices
      const numbers = line.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        // Simple heuristic: if first part is a number without decimals, it might be quantity
        const firstNum = numbers[0];
        if (!firstNum.includes('.') && parseInt(firstNum) < 100 && line.startsWith(firstNum)) {
          stock = parseInt(firstNum);
          name = name.replace(firstNum, '').trim();
        } else if (numbers.length > 1) {
           const lastNum = numbers[numbers.length - 1];
           if (lastNum.includes('.') || parseInt(lastNum) > 20) {
             price = parseFloat(lastNum);
             name = name.replace(lastNum, '').trim();
           }
        }
      }

      // Cleanup name
      name = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, ' ').replace(/\s+/g, ' ').trim();

      if (name.length > 2) {
        products.push({
          name: name.substring(0, 40),
          category: 'Maquillaje', // Default
          stock,
          price,
          campaign: '',
          barcode: '',
          variant: '',
          imageUrl: ''
        });
      }
    });

    if (products.length === 0) {
      toast.error("No se detectaron productos válidos.");
      return;
    }

    setParsedProducts(products);
    setStep(2);
  };

  const handleImport = async () => {
    if (!currentUser || parsedProducts.length === 0) return;
    setIsProcessing(true);

    try {
      let importedCount = 0;
      for (const product of parsedProducts) {
        const productData = {
          ...product,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'products'), productData);
        
        await logHistory(currentUser.uid, {
          action: 'ADD_PRODUCT',
          productId: docRef.id,
          productName: product.name,
          quantity: product.stock,
          details: `Producto importado de factura (Stock: ${product.stock})`
        });
        importedCount++;
      }

      toast.success(`${importedCount} productos importados con éxito`);
      setInvoiceText('');
      setParsedProducts([]);
      setStep(1);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al importar la factura");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => onClose()}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 md:p-8 relative my-8 transition-colors" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 m-0">
                <FileText className="text-orange-500" /> 
                {step === 1 ? 'Importar Factura Rápida' : 'Revisar Productos'}
              </h2>
              <button onClick={() => onClose()} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm">
                  Copia y pega el texto de tu factura digital o documento aquí. El sistema intentará detectar los nombres de los productos y sus cantidades automáticamente. (Función Experimental)
                </div>
                
                <textarea 
                  value={invoiceText}
                  onChange={(e) => setInvoiceText(e.target.value)}
                  className="w-full h-64 p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
                  placeholder="Ejemplo:\n1 OHM PARFUM 120.00\n2 BB CREAM MATTE 45.00"
                />

                <button 
                  onClick={handleParse}
                  className="w-full py-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-colors shadow-md mt-2"
                >
                  Analizar Texto
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={20} /> Se detectaron {parsedProducts.length} productos. Revisa la lista antes de importarlos.
                </div>

                <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
                  {parsedProducts.map((p, i) => (
                    <div key={i} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-white dark:bg-slate-800">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={p.name}
                          onChange={(e) => {
                            const newP = [...parsedProducts];
                            newP[i].name = e.target.value;
                            setParsedProducts(newP);
                          }}
                          className="w-full font-bold text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:outline-none px-1"
                        />
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col">
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Cant.</label>
                          <input 
                            type="number" 
                            value={p.stock}
                            onChange={(e) => {
                              const newP = [...parsedProducts];
                              newP[i].stock = parseInt(e.target.value) || 0;
                              setParsedProducts(newP);
                            }}
                            className="w-16 text-center font-bold bg-slate-100 dark:bg-slate-700 rounded-md py-1 px-2 border-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Precio S/</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={p.price}
                            onChange={(e) => {
                              const newP = [...parsedProducts];
                              newP[i].price = parseFloat(e.target.value) || 0;
                              setParsedProducts(newP);
                            }}
                            className="w-24 text-center font-bold bg-slate-100 dark:bg-slate-700 rounded-md py-1 px-2 border-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <button 
                          onClick={() => setParsedProducts(parsedProducts.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 p-2 mt-4"
                          title="Eliminar de la lista"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded-xl transition-colors"
                  >
                    Volver
                  </button>
                  <button 
                    onClick={handleImport}
                    disabled={isProcessing || parsedProducts.length === 0}
                    className="flex-[2] py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-md"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Importar al Inventario'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
