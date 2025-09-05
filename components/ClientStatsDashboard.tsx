import React, { useEffect, useState } from 'react';
import { RootService } from '../services/rootService';
import { ClientStats } from '../types';

export const ClientStatsDashboard: React.FC = () => {
    const [stats, setStats] = useState<ClientStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log("ClientStatsDashboard is rendering.");
        const fetchStats = async () => {
            try {
                const clientStats = await RootService.getClientsStats();
                console.log("Fetched client stats:", clientStats);
                setStats(clientStats);
            } catch (error) {
                console.error("Failed to fetch client stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return <div>Loading client statistics...</div>;
    }

    if (stats.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Client Statistics</h2>
                <p>No client statistics to display.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Client Statistics</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Client (Email)</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Libraries</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Documents</th>
                            <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Searches</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {stats.map((client) => (
                            <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-100">
                                <td className="py-3 px-4">{client.email}</td>
                                <td className="py-3 px-4">{client.libraries}</td>
                                <td className="py-3 px-4">{client.documents}</td>
                                <td className="py-3 px-4">{client.searches}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
