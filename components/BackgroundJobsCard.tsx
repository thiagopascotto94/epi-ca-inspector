import React from 'react';
import { SimilarityJob } from '../types';
import { TrashIcon } from './Icon';

interface BackgroundJobsCardProps {
    jobs: SimilarityJob[];
    onViewResult: (job: SimilarityJob) => void;
    onDeleteJob: (jobId: string) => void;
}

const StatusBadge: React.FC<{ status: SimilarityJob['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
        case 'pending':
            return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`}>Pendente</span>;
        case 'processing':
            return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`}>Processando</span>;
        case 'completed':
            return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}>Concluído</span>;
        case 'failed':
            return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`}>Falhou</span>;
        default:
            return <span className={`${baseClasses} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`}>Desconhecido</span>;
    }
};

export const BackgroundJobsCard: React.FC<BackgroundJobsCardProps> = ({ jobs, onViewResult, onDeleteJob }) => {
    if (jobs.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Buscas em Segundo Plano</h2>
            <div className="space-y-4">
                {jobs.map(job => (
                    <div key={job.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="font-bold text-slate-700 dark:text-slate-200">CA {job.inputData.caData.caNumber}: {job.inputData.caData.equipmentName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Biblioteca: {job.inputData.libraryName} &bull; Criado em: {new Date(job.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <StatusBadge status={job.status} />
                                <div className="flex items-center gap-2">
                                     {job.status === 'completed' && (
                                        <button onClick={() => onViewResult(job)} className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-500 transition-colors">
                                            Ver Resultado
                                        </button>
                                    )}
                                     {job.status === 'failed' && (
                                        <button onClick={() => onViewResult(job)} className="px-3 py-1 text-sm font-medium text-white bg-red-500 border border-red-500 rounded-md hover:bg-red-600 transition-colors">
                                            Ver Erro
                                        </button>
                                    )}
                                    <button onClick={() => onDeleteJob(job.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md" aria-label={`Excluir busca de ${job.inputData.caData.caNumber}`}>
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {job.status === 'processing' && job.totalFiles && job.totalFiles > 0 && (
                            <div className="mt-3">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{job.progressMessage || 'Processando...'}</p>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${Math.min(100, (job.progress || 0) / (2 * job.totalFiles) * 100)}%` }}>
                                  </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};