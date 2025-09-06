import { useState, useEffect } from 'react';
import { PlanService } from '../services/planService';
import { Plan } from '../types';
import { Header } from '../components/Header';
import { AuthService } from '../authService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useStripe } from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function SubscriptionPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stripe = useStripe();
    const functions = getFunctions();

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setIsLoading(true);
                const fetchedPlans = await PlanService.getPlans();
                setPlans(fetchedPlans);

                const user = AuthService.getCurrentUser();
                if (user) {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userPlan = fetchedPlans.find(p => p.id === userData.planId);
                        setCurrentPlan(userPlan || null);
                    }
                }
                setError(null);
            } catch (err) {
                setError('Failed to fetch subscription data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        if (!stripe) {
            setError("Stripe.js has not loaded yet.");
            return;
        }

        setIsRedirecting(true);
        setError(null);

        try {
            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const result = await createCheckoutSession({ planId });
            const { sessionId } = result.data as any;

            const { error } = await stripe.redirectToCheckout({ sessionId });

            if (error) {
                setError(error.message || "An error occurred during redirection to checkout.");
            }
        } catch (err) {
            setError("Failed to create checkout session.");
            console.error(err);
        } finally {
            setIsRedirecting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="container mx-auto p-4">
                <h1 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>

                {isLoading && <p className="text-center">Loading plans...</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map(plan => (
                        <div key={plan.id} className={`p-6 rounded-lg shadow-md text-center flex flex-col ${currentPlan?.id === plan.id ? 'border-2 border-blue-500' : 'bg-white dark:bg-gray-800'}`}>
                            <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
                            <p className="text-4xl font-extrabold mb-4">${plan.price}<span className="text-base font-normal">/month</span></p>
                            <p className="mb-6">{plan.description}</p>
                            <ul className="text-left mb-6 space-y-2">
                                <li><strong>{plan.caQueriesLimit}</strong> CA Queries per month</li>
                                <li><strong>{plan.similarSearchesLimit}</strong> Similar Searches per month</li>
                            </ul>
                            <div className="mt-auto">
                                {currentPlan?.id === plan.id ? (
                                    <button className="w-full bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed" disabled>
                                        Current Plan
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSelectPlan(plan.id)}
                                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                                        disabled={isRedirecting}
                                    >
                                        {isRedirecting ? 'Redirecting...' : (currentPlan && currentPlan.price < plan.price ? 'Upgrade' : 'Select Plan')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
