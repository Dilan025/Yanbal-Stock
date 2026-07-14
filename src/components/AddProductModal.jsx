import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, Search, Camera, ScanLine, Zap, ZapOff } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import catalog from '../data/catalog.json';
import { logHistory } from '../utils/history';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';

export default function AddProductModal({ isOpen, onClose, productToEdit = null, initialBarcode = '' }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Maquillaje');
  const [stock, setStock] = useState(1);
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [campaign, setCampaign] = useState('');
  const [variant, setVariant] = useState('');
  const [minStockAlert, setMinStockAlert] = useState(2);
  const [imageBase64, setImageBase64] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [userCatalog, setUserCatalog] = useState([]);
  const [flashOn, setFlashOn] = useState(false);
  const scannerRef = useRef(null);
  const { currentUser } = useAuth();
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchCatalogs = async () => {
        try {
          const products = [];
          
          // Cargar productos del usuario
          const userSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'products'));
          userSnapshot.forEach(doc => {
            const data = doc.data();
            products.push({
              name: data.name,
              category: data.category,
              imageUrl: data.imageUrl,
              price: data.price,
              barcode: data.barcode || ''
            });
          });
          
          // Cargar catálogo global
          const globalSnapshot = await getDocs(collection(db, 'global_catalog'));
          globalSnapshot.forEach(doc => {
            const data = doc.data();
            products.push({
              name: data.name,
              category: data.category,
              imageUrl: data.imageUrl,
              barcode: data.barcode || ''
            });
          });
          
          setUserCatalog(products);
        } catch (error) {
          console.error("Error loading catalogs", error);
        }
      };
      fetchCatalogs();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.name || '');
        setCategory(productToEdit.category || 'Maquillaje');
        setStock(productToEdit.stock || 0);
        setPrice(productToEdit.price || '');
        setBarcode(productToEdit.barcode || '');
        setCampaign(productToEdit.campaign || '');
        setVariant(productToEdit.variant || '');
        setMinStockAlert(productToEdit.minStockAlert !== undefined ? productToEdit.minStockAlert : 2);
        setImageBase64(productToEdit.imageUrl || '');
      } else {
        setName('');
        setCategory('Maquillaje');
        setStock(1);
        setPrice('');
        setBarcode(initialBarcode);
        setCampaign('');
        setVariant('');
        setMinStockAlert(2);
        setImageBase64('');
      }
    }
  }, [isOpen, productToEdit, initialBarcode]);

  useEffect(() => {
    if (name.trim() === '' || productToEdit) {
      setSuggestions([]);
      return;
    }

    const combined = [...userCatalog, ...catalog];
    const uniqueMap = new Map();
    
    combined.forEach(p => {
      const key = p.name.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      } else if (p.imageUrl && !uniqueMap.get(key).imageUrl) {
        uniqueMap.set(key, p);
      }
    });
    
    const uniqueCatalog = Array.from(uniqueMap.values());

    const filtered = uniqueCatalog.filter(p => 
      p.name.toLowerCase().includes(name.toLowerCase())
    );
    setSuggestions(filtered);
  }, [name, productToEdit, userCatalog]);

  // Autocompletar por código de barras
  useEffect(() => {
    if (barcode.trim().length > 3 && !productToEdit) {
      const combined = [...userCatalog, ...catalog];
      const match = combined.find(p => p.barcode && p.barcode.toString() === barcode.trim());
      
      if (match && match.name !== name) {
        setName(match.name);
        if (match.category) setCategory(match.category);
        if (match.imageUrl && !imageBase64) setImageBase64(match.imageUrl);
        if (match.price && !price) setPrice(match.price);
        toast.success("¡Producto autocompletado!");
      }
    }
  }, [barcode]);

  useEffect(() => {
    let html5QrCode;
    if (isScanning && isOpen) {
      setFlashOn(false);
      setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777778, // Configura para aspecto 16:9 (mayor calidad)
          },
          (decodedText) => {
            setBarcode(decodedText);
            setIsScanning(false);
            toast.success("Código escaneado exitosamente");
          },
          (errorMessage) => {
            // Se ignora el error continuo de no encontrar QR
          }
        ).catch((err) => {
          console.error(err);
          toast.error("Error al iniciar la cámara. Verifica los permisos.");
        });
      }, 100);
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [isScanning, isOpen]);

  const toggleFlash = async () => {
    if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 = SCANNING
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: !flashOn }]
        });
        setFlashOn(!flashOn);
      } catch (err) {
        toast.error("Tu dispositivo o navegador no soporta encender la linterna");
      }
    }
  };

  const handleSelectProduct = (product) => {
    setName(product.name);
    if (product.category) setCategory(product.category);
    if (product.barcode) setBarcode(product.barcode);
    if (product.imageUrl) setImageBase64(product.imageUrl);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.15, // Max 150KB
        maxWidthOrHeight: 600,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
    } catch (error) {
      console.error("Error compressing image:", error);
      toast.error("Error al procesar la imagen");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    setIsLoading(true);
    try {
      const productData = {
        name,
        category,
        stock: parseInt(stock, 10),
        price: parseFloat(price) || 0,
        barcode,
        campaign,
        variant,
        minStockAlert: parseInt(minStockAlert, 10) || 2,
        imageUrl: imageBase64,
      };

      if (productToEdit) {
        const productRef = doc(db, 'users', currentUser.uid, 'products', productToEdit.id);
        await updateDoc(productRef, productData);
        
        await logHistory(currentUser.uid, {
          action: 'EDIT_PRODUCT',
          productId: productToEdit.id,
          productName: name,
          quantity: parseInt(stock, 10),
          details: `Producto actualizado`
        });
        toast.success('Producto actualizado con éxito');
      } else {
        productData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'products'), productData);
        
        await logHistory(currentUser.uid, {
          action: 'ADD_PRODUCT',
          productId: docRef.id,
          productName: name,
          quantity: parseInt(stock, 10),
          details: `Nuevo producto agregado (Stock: ${stock})`
        });
        toast.success('Producto agregado con éxito');
      }

      // Guardar en el Catálogo Global Colaborativo
      try {
        const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedName) {
          const globalRef = doc(db, 'global_catalog', normalizedName);
          // Usamos merge para no sobreescribir si alguien ya subió una mejor foto, 
          // a menos que nosotros estemos subiendo una nueva foto.
          const globalData = {
            name: name.trim(),
            category,
            updatedAt: serverTimestamp()
          };
          if (barcode) globalData.barcode = barcode;
          if (imageBase64) globalData.imageUrl = imageBase64;
          
          await setDoc(globalRef, globalData, { merge: true });
        }
      } catch (e) {
        console.error("Error updating global catalog:", e);
      }

      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Hubo un error al guardar el producto.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => { setIsScanning(false); onClose(); }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 relative my-8 transition-colors" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white m-0">
                {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => { setIsScanning(false); onClose(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="text-center">
                <input 
                  type="file" 
                  id="productImage" 
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <label 
                  htmlFor="productImage" 
                  className={`block w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${imageBase64 ? 'border-transparent bg-slate-50 dark:bg-slate-700' : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 bg-slate-50 dark:bg-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-500/10'}`}
                  style={imageBase64 ? { backgroundImage: `url(${imageBase64})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
                >
                  {!imageBase64 && (
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <Upload size={32} className="mb-2 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-medium">Toca para subir foto</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="relative flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre o Búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Empieza a escribir... (Ej. Ohm)"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    required
                  />
                </div>
                
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg top-full left-0 list-none p-0">
                    {suggestions.map((p, index) => (
                      <li 
                        key={index}
                        className="p-3 cursor-pointer flex items-center gap-3 border-b border-slate-50 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-slate-600 transition-colors"
                        onClick={() => handleSelectProduct(p)}
                      >
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain rounded" />}
                        <div>
                          <div className="font-medium text-sm text-slate-800 dark:text-white">{p.name}</div>
                          <div className="text-xs text-orange-500">{p.category}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isScanning && (
                <div className="w-full rounded-xl overflow-hidden border-2 border-orange-500 bg-black relative">
                  <div id="reader" className="w-full min-h-[250px]"></div>
                  <div className="absolute top-2 right-2 flex gap-2 z-50">
                    <button type="button" onClick={toggleFlash} className="bg-slate-800/80 text-white p-2 rounded-full backdrop-blur-md hover:bg-slate-700">
                      {flashOn ? <ZapOff size={20} /> : <Zap size={20} />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setIsScanning(false)} className="w-full py-3 bg-slate-900 text-white font-medium text-sm border-t border-slate-700 hover:bg-slate-800 transition-colors">
                    Cancelar Escáner
                  </button>
                </div>
              )}

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[120px] flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                  <select 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Maquillaje">Maquillaje</option>
                    <option value="Tratamiento Facial">Tratamiento Facial</option>
                    <option value="Cuidado Personal">Cuidado Personal</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="Joyería">Joyería</option>
                    <option value="Hombres">Hombres</option>
                    <option value="Niños y Bebés">Niños y Bebés</option>
                    <option value="Protección Solar">Protección Solar</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[100px] flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                    placeholder="0.00"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                
                <div className="flex-[0.5] min-w-[70px] flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock</label>
                  <input
                    type="number"
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-bold text-lg"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-[2] flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Barras</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Opcional"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                    {isMobile && (
                      <button 
                        type="button" 
                        onClick={() => setIsScanning(!isScanning)}
                        className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title="Escanear Código"
                      >
                        <ScanLine size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-[1.5] flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tono / Variante</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej. Rojo Pasión (Opcional)"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Campaña</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej. C07"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avisar stock bajo en:</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    placeholder="Ej. 2"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-md text-lg"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (productToEdit ? 'Guardar Cambios' : 'Guardar Producto')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
