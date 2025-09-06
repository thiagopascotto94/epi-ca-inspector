import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Payment } from '../types';

export class PaymentService {
    static async getPayments(): Promise<Payment[]> {
        const paymentsCollectionRef = collection(db, 'payments');
        const q = query(paymentsCollectionRef, orderBy('createdAt', 'desc'));
        const paymentsSnapshot = await getDocs(q);
        return paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
    }
}
