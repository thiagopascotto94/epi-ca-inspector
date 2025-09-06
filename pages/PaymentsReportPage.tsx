import { useState, useEffect } from 'react';
import { PaymentService } from '../services/paymentService';
import { Payment } from '../types';
import { Header } from '../components/Header';

export default function PaymentsReportPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setIsLoading(true);
            const fetchedPayments = await PaymentService.getPayments();
            setPayments(fetchedPayments);
            setError(null);
        } catch (err) {
            setError('Failed to fetch payments.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Payments Report</h1>

                {isLoading && <p>Loading payments...</p>}
                {error && <p className="text-red-500">{error}</p>}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    <th className="p-2">Date</th>
                                    <th className="p-2">User ID</th>
                                    <th className="p-2">Plan ID</th>
                                    <th className="p-2">Amount</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Stripe Payment ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(payment => (
                                    <tr key={payment.id} className="border-b dark:border-gray-700">
                                        <td className="p-2">{new Date(payment.createdAt.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="p-2">{payment.userId}</td>
                                        <td className="p-2">{payment.planId}</td>
                                        <td className="p-2">{payment.amount} {payment.currency.toUpperCase()}</td>
                                        <td className="p-2">{payment.status}</td>
                                        <td className="p-2">{payment.stripePaymentId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
