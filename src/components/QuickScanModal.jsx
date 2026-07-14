import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Plus, Minus, Package, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-hot-toast';

export default function QuickScanModal({ 
  isOpen, 
  onClose, 
  products, 
  onUpdateStock, 
  onProductNotFound 
}) {
  const [isScanning, setIsScanning] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const scannerRef = useRef(null);
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    let html5QrCode;
    
    if (isOpen && isScanning && !matchedProduct) {
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("quick-reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            handleBarcodeSubmit(decodedText);
          },
          (errorMessage) => {
            // ignore continuous scanning errors
          }
        ).catch((err) => {
          console.error(err);
          setIsScanning(false);
        });
      }, 100);
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [isOpen, isScanning, matchedProduct]);

  const handleBarcodeSubmit = (code = barcodeInput) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    
    // Buscar en inventario local
    const found = products.find(p => p.barcode && p.barcode.toString() === cleanCode);
    
    if (found) {
      // Producto existe, preguntar cantidad a sumar
      setMatchedProduct(found);
      setQuantityToAdd(1); // default
      setBarcodeInput('');
      setIsScanning(false);
    } else {
      // No existe localmente, enviar a Agregar Producto
      toast.error('Producto no encontrado en inventario');
      onProductNotFound(cleanCode);
      handleClose();
    }
  };

  const handleConfirmAdd = async () => {
    if (!matchedProduct || quantityToAdd <= 0) return;
    
    await onUpdateStock(matchedProduct.id, matchedProduct.stock, quantityToAdd, matchedProduct.name);
    toast.success(`Se agregaron ${quantityToAdd} al stock de ${matchedProduct.name}`);
    handleClose();
  };

  const handleClose = () => {
    if (scannerRef.current && scannerRef.current.getState() === 2) {
      scannerRef.current.stop().catch(console.error);
    }
    setMatchedProduct(null);
    setBarcodeInput('');
    setIsScanning(true);
    setQuantityToAdd(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Camera size={20} className="text-orange-500" />
              Escáner Rápido
            </h3>
            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {!matchedProduct ? (
              <div className="flex flex-col gap-4">
                {isMobile && (
                  <>
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {isScanning ? (
                        <div id="quick-reader" className="w-full h-full bg-black object-cover"></div>
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center">
                          <Camera size={48} className="text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm text-slate-500">Cámara pausada o no soportada</p>
                          <button 
                            onClick={() => setIsScanning(true)}
                            className="mt-4 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold rounded-lg text-sm"
                          >
                            Intentar Cámara
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase">O escribe el código</span>
                      <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                    </div>
                  </>
                )}
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleBarcodeSubmit();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                      placeholder="Ej: 0014140"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-slate-800 dark:bg-slate-700 text-white px-4 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                  >
                    Buscar
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                {matchedProduct.imageUrl ? (
                  <img src={matchedProduct.imageUrl} alt={matchedProduct.name} className="w-32 h-32 object-contain mb-4" />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                    <Package size={48} className="text-slate-300" />
                  </div>
                )}
                
                <span className="px-2 py-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 rounded-full mb-2">
                  {matchedProduct.category}
                </span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight mb-1">{matchedProduct.name}</h4>
                <p className="text-sm text-slate-500 mb-6">Stock actual: {matchedProduct.stock}</p>
                
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">¿Cuánto stock deseas sumar?</p>
                
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
                  <button 
                    onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-3xl font-black text-slate-800 dark:text-white w-16 text-center">{quantityToAdd}</span>
                  <button 
                    onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <div className="flex w-full gap-3 mt-4">
                  <button 
                    onClick={() => {
                      setMatchedProduct(null);
                      setIsScanning(true);
                    }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmAdd}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/30"
                  >
                    Confirmar (+{quantityToAdd})
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
