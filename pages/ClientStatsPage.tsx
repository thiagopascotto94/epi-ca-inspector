import React from 'react';
import { ClientStatsDashboard } from '../components/ClientStatsDashboard';
import { Link } from 'react-router-dom';

const ClientStatsPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Client Statistics</h1>
            </header>
            <ClientStatsDashboard />
        </div>
    );
};

export default ClientStatsPage;
