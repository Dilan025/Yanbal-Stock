import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logHistory = async (userId, {
  action, // 'ADD_PRODUCT', 'DELETE_PRODUCT', 'STOCK_UP', 'STOCK_DOWN', 'LOAN_LENT', 'LOAN_RETURNED'
  productId,
  productName,
  quantity = 1,
  details = ''
}) => {
  if (!userId) return null;
  try {
    const docRef = await addDoc(collection(db, 'users', userId, 'history'), {
      action,
      productId: productId || '',
      productName: productName || 'Producto Desconocido',
      quantity,
      details,
      timestamp: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    console.error("Error logging history:", error);
    return null;
  }
};
