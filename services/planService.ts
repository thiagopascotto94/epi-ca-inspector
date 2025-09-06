import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plan } from '../types';

export class PlanService {
    static async getPlans(): Promise<Plan[]> {
        const plansCollectionRef = collection(db, 'plans');
        const plansSnapshot = await getDocs(plansCollectionRef);
        return plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
    }

    static async addPlan(plan: Omit<Plan, 'id'>): Promise<string> {
        const plansCollectionRef = collection(db, 'plans');
        const docRef = await addDoc(plansCollectionRef, plan);
        return docRef.id;
    }

    static async updatePlan(planId: string, plan: Partial<Plan>): Promise<void> {
        const planDocRef = doc(db, 'plans', planId);
        await updateDoc(planDocRef, plan);
    }

    static async deletePlan(planId: string): Promise<void> {
        const planDocRef = doc(db, 'plans', planId);
        await deleteDoc(planDocRef);
    }
}
