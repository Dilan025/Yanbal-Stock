import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logHistory = async (userId, {
  action, // 'ADD_PRODUCT', 'DELETE_PRODUCT', 'STOCK_UP', 'STOCK_DOWN', 'LOAN_LENT', 'LOAN_RETURNED'
  productId,
  productName,
  quantity = 1,
  details = ''
}) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'users', userId, 'history'), {
      action,
      productId: productId || '',
      productName: productName || 'Producto Desconocido',
      quantity,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error guardando en el historial:", error);
  }
};
