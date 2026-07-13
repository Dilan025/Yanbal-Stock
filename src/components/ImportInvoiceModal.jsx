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
    const lines = invoiceText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const products = [];

    // Helper to process a grouped product string
    const processProductGroup = (groupStr) => {
      // Example groupStr: "20013848 1.00 UND 2606006016249 37 YA! DELINEADOR MULTIUSOS A PRUEBA DE AGUA VINO 0000006B01(1) 17.00 4.25 12.75"
      // Match the initial part: [8-digit code] [quantity] UND
      const initialMatch = groupStr.match(/^(\d{7,9})\s+(\d+(?:\.\d+)?)\s+(?:UND|Unidad)/i);
      
      let stock = 1;
      let rawRemainder = groupStr;

      if (initialMatch) {
        stock = parseInt(initialMatch[2], 10);
        rawRemainder = groupStr.substring(initialMatch[0].length).trim();
      } else {
        // Fallback for simple lines
        const numbers = groupStr.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length > 0) {
          const firstNum = numbers[0];
          if (!firstNum.includes('.') && parseInt(firstNum) < 100 && groupStr.startsWith(firstNum)) {
            stock = parseInt(firstNum);
            rawRemainder = groupStr.replace(firstNum, '').trim();
          }
        }
      }

      // Now we have rawRemainder like: "2606006016249 37 YA! DELINEADOR MULTIUSOS ... 0000006B01(1) 17.00 4.25 12.75"
      // Let's tokenize by space
      const tokens = rawRemainder.split(/\s+/);
      
      let price = 0;
      // Try to find the last 3 numeric tokens (P. UNITARIO, DSCTO. UNIT, TOTAL)
      // Usually, they are at the very end
      const isNumeric = (str) => /^\d+\.\d+$/.test(str) || /^\d+$/.test(str);
      
      let numericCount = 0;
      let priceIndex = -1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (isNumeric(tokens[i])) {
          numericCount++;
          if (numericCount === 3) { // 3rd from the end is P. UNITARIO
            priceIndex = i;
            break;
          }
        } else {
          // If we hit a non-numeric before finding 3, maybe there are fewer numbers (e.g. promo items with 0.00)
          if (numericCount > 0 && i >= tokens.length - 3) continue; // Keep looking if we are at the very end
          break;
        }
      }

      let nameTokens = [];
      
      if (priceIndex !== -1) {
        price = parseFloat(tokens[priceIndex]);
        // The token right before priceIndex is usually the Lote.
        // We skip it for the name.
        nameTokens = tokens.slice(0, priceIndex - 1);
      } else {
        // Fallback if we couldn't find the exact 3 prices structure
        // Look for price at the end
        if (tokens.length > 0 && isNumeric(tokens[tokens.length - 1])) {
          price = parseFloat(tokens[tokens.length - 1]);
          nameTokens = tokens.slice(0, tokens.length - 1);
        } else {
          nameTokens = tokens;
        }
      }

      let name = nameTokens.join(' ');
      // Clean leading numeric codes (COD. RAPIDO)
      name = name.replace(/^[\d\s]+/, '').trim();
      // Clean non-alphabetic chars
      name = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s!+\-]/g, '').replace(/\s+/g, ' ').trim();

      if (name.length > 2 && !name.toLowerCase().includes('envio')) {
        products.push({
          name: name.substring(0, 50),
          category: 'Maquillaje',
          stock,
          price,
          campaign: '',
          barcode: '',
          variant: '',
          imageUrl: ''
        });
      }
    };

    // Group lines that belong to the same product
    let currentGroup = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // A new product line starts with an 8-digit code or is a known item like ENVIO
      if (/^\d{8}\s/.test(line) || /^\-\s+\d+\.\d+\s+Unidad/.test(line)) {
        if (currentGroup) {
          processProductGroup(currentGroup);
        }
        currentGroup = line;
      } else {
        // It's a continuation of the previous product
        if (currentGroup) {
          currentGroup += " " + line;
        } else {
          // If there is no current group, this might be a simple paste without PDF formatting
          processProductGroup(line);
        }
      }
    }
    if (currentGroup) {
      processProductGroup(currentGroup);
    }

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
