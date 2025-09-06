import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { AuthService } from '../authService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Plan } from '../types';
import { PlanService } from '../services/planService';

interface UserUsageData {
    email: string;
    planId: string;
    caQueriesCount: number;
    similarSearchesCount: number;
    usageLastReset: Date;
}

export default function UsagePage() {
    const [usageData, setUsageData] = useState<UserUsageData | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsageData = async () => {
            try {
                setIsLoading(true);
                const user = AuthService.getCurrentUser();
                if (user) {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as UserUsageData;
                        setUsageData(userData);

                        const plans = await PlanService.getPlans();
                        const userPlan = plans.find(p => p.id === userData.planId);
                        setPlan(userPlan || null);
                    }
                }
                setError(null);
            } catch (err) {
                setError('Failed to fetch usage data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsageData();
    }, []);

    const renderProgressBar = (value: number, limit: number) => {
        const percentage = limit > 0 ? (value / limit) * 100 : 0;
        return (
            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-center mb-8">My Usage</h1>

                {isLoading && <p className="text-center">Loading usage data...</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}

                {usageData && plan && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold mb-4">Current Plan: {plan.name}</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold">CA Queries</h3>
                                <p className="text-lg">{usageData.caQueriesCount} / {plan.caQueriesLimit}</p>
                                {renderProgressBar(usageData.caQueriesCount, plan.caQueriesLimit)}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">Similar Searches</h3>
                                <p className="text-lg">{usageData.similarSearchesCount} / {plan.similarSearchesLimit}</p>
                                {renderProgressBar(usageData.similarSearchesCount, plan.similarSearchesLimit)}
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-500">
                                Your usage statistics will reset on {new Date(usageData.usageLastReset.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
