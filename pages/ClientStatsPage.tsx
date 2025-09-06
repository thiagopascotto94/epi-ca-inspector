import React from 'react';
import { ClientStatsDashboard } from '../components/ClientStatsDashboard';
import { Link } from 'react-router-dom';

const ClientStatsPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Client Statistics</h1>
                <div>
                    <Link to="/admin/payments" className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 mr-4">
                        Payments Report
                    </Link>
                    <Link to="/admin/plans" className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 mr-4">
                        Manage Plans
                    </Link>
                    <Link to="/" className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                        Back to Dashboard
                    </Link>
                </div>
            </header>
            <ClientStatsDashboard />
        </div>
    );
};

export default ClientStatsPage;
