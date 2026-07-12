import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setNeedRefresh(false)
  }

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-2xl bg-white dark:bg-slate-800 border-2 border-orange-500 max-w-sm w-[calc(100%-2rem)] flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Actualización Disponible</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Hay una nueva versión de la aplicación. Actualiza para ver los cambios.
              </p>
            </div>
            <button 
              onClick={close}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={20} />
            </button>
          </div>
          <button 
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw size={18} />
            Actualizar ahora
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ReloadPrompt
