import { useState, useEffect } from 'react';
import { PlanService } from '../services/planService';
import { Plan } from '../types';
import { Header } from '../components/Header';

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [formState, setFormState] = useState<Omit<Plan, 'id'>>({
        name: '',
        price: 0,
        caQueriesLimit: 0,
        similarSearchesLimit: 0,
        description: ''
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setIsLoading(true);
            const fetchedPlans = await PlanService.getPlans();
            setPlans(fetchedPlans);
            setError(null);
        } catch (err) {
            setError('Failed to fetch plans.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({
            ...prevState,
            [name]: name === 'price' || name === 'caQueriesLimit' || name === 'similarSearchesLimit' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                await PlanService.updatePlan(editingPlan.id, formState);
            } else {
                await PlanService.addPlan(formState);
            }
            setFormState({ name: '', price: 0, caQueriesLimit: 0, similarSearchesLimit: 0, description: '' });
            setEditingPlan(null);
            fetchPlans();
        } catch (err) {
            setError('Failed to save plan.');
            console.error(err);
        }
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormState({
            name: plan.name,
            price: plan.price,
            caQueriesLimit: plan.caQueriesLimit,
            similarSearchesLimit: plan.similarSearchesLimit,
            description: plan.description
        });
    };

    const handleDelete = async (planId: string) => {
        if (window.confirm('Are you sure you want to delete this plan?')) {
            try {
                await PlanService.deletePlan(planId);
                fetchPlans();
            } catch (err) {
                setError('Failed to delete plan.');
                console.error(err);
            }
        }
    };

    const cancelEdit = () => {
        setEditingPlan(null);
        setFormState({ name: '', price: 0, caQueriesLimit: 0, similarSearchesLimit: 0, description: '' });
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Manage Subscription Plans</h1>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-semibold mb-4">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                name="name"
                                value={formState.name}
                                onChange={handleInputChange}
                                placeholder="Plan Name"
                                className="p-2 border rounded dark:bg-gray-700"
                                required
                            />
                            <input
                                type="number"
                                name="price"
                                value={formState.price}
                                onChange={handleInputChange}
                                placeholder="Price"
                                className="p-2 border rounded dark:bg-gray-700"
                                required
                            />
                            <input
                                type="number"
                                name="caQueriesLimit"
                                value={formState.caQueriesLimit}
                                onChange={handleInputChange}
                                placeholder="CA Queries Limit"
                                className="p-2 border rounded dark:bg-gray-700"
                                required
                            />
                            <input
                                type="number"
                                name="similarSearchesLimit"
                                value={formState.similarSearchesLimit}
                                onChange={handleInputChange}
                                placeholder="Similar Searches Limit"
                                className="p-2 border rounded dark:bg-gray-700"
                                required
                            />
                        </div>
                        <textarea
                            name="description"
                            value={formState.description}
                            onChange={handleInputChange}
                            placeholder="Description"
                            className="w-full p-2 border rounded mt-4 dark:bg-gray-700"
                            rows={3}
                            required
                        />
                        <div className="flex justify-end gap-4 mt-4">
                            {editingPlan && (
                                <button type="button" onClick={cancelEdit} className="bg-gray-500 text-white px-4 py-2 rounded">
                                    Cancel
                                </button>
                            )}
                            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                                {editingPlan ? 'Update Plan' : 'Create Plan'}
                            </button>
                        </div>
                    </form>
                </div>

                {isLoading && <p>Loading plans...</p>}
                {error && <p className="text-red-500">{error}</p>}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Existing Plans</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Price</th>
                                    <th className="p-2">CA Queries</th>
                                    <th className="p-2">Similar Searches</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map(plan => (
                                    <tr key={plan.id} className="border-b dark:border-gray-700">
                                        <td className="p-2">{plan.name}</td>
                                        <td className="p-2">${plan.price}</td>
                                        <td className="p-2">{plan.caQueriesLimit}</td>
                                        <td className="p-2">{plan.similarSearchesLimit}</td>
                                        <td className="p-2">
                                            <button onClick={() => handleEdit(plan)} className="text-blue-500 hover:underline mr-4">Edit</button>
                                            <button onClick={() => handleDelete(plan.id)} className="text-red-500 hover:underline">Delete</button>
                                        </td>
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
