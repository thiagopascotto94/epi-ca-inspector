
import React from 'react';
import { CAData } from '../types';
import { CheckCircleIcon, ExclamationCircleIcon, CalendarDaysIcon, LinkIcon, BuildingOfficeIcon, MapPinIcon, DocumentTextIcon } from './Icon';

interface CADetailCardProps {
  data: CAData;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="py-2">
    <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
      {icon}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-slate-900">{value}</dd>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);

export const CADetailCard: React.FC<CADetailCardProps> = ({ data }) => {
  const isExpired = data.status.toUpperCase() !== 'VÁLIDO';

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{data.equipmentName}</h1>
        <p className="text-md text-slate-500">{data.equipmentType}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
                <p className="text-sm text-slate-500">Nº CA</p>
                <p className="text-lg font-semibold text-slate-700">{data.caNumber}</p>
            </div>
            <div>
                <p className="text-sm text-slate-500">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {isExpired ? <ExclamationCircleIcon className="w-4 h-4 mr-1"/> : <CheckCircleIcon className="w-4 h-4 mr-1"/>}
                {data.status}
                </span>
            </div>
            <div>
                <p className="text-sm text-slate-500">Validade</p>
                <p className="text-lg font-semibold text-slate-700 flex items-center justify-center gap-1">
                    <CalendarDaysIcon className="w-5 h-5 text-slate-400"/>
                    {data.validity}
                </p>
            </div>
            <div>
                <p className="text-sm text-slate-500">Vence em</p>
                <p className="text-lg font-semibold text-slate-700">{data.daysRemaining || 'N/A'} dias</p>
            </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Section title="Descrição e Uso">
                <dl className="divide-y divide-slate-200">
                    <InfoRow label="Descrição Completa" value={data.description} />
                    <InfoRow label="Aprovado Para" value={data.approvedFor} />
                    <InfoRow label="Restrições" value={data.restrictions} />
                    <InfoRow label="Observações" value={data.observations} />
                </dl>
            </Section>

            <Section title="Dados Complementares">
                 <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                    <InfoRow label="Marcação" value={data.markings} />
                    <InfoRow label="Referências" value={data.references} />
                    <InfoRow label="Nº Processo" value={data.processNumber} />
                    <InfoRow label="Natureza" value={data.nature} />
                </dl>
            </Section>

            <Section title="Normas Técnicas">
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {data.norms.map((norm, index) => <li key={index}>{norm}</li>)}
                </ul>
            </Section>
        </div>
        <div className="lg:col-span-1">
            <Section title="Fabricante">
                <dl>
                    <InfoRow label="Razão Social" value={data.manufacturer.name} icon={<BuildingOfficeIcon className="w-5 h-5"/>}/>
                    <InfoRow label="CNPJ" value={data.manufacturer.cnpj} />
                    <InfoRow label="Endereço" value={data.manufacturer.address} icon={<MapPinIcon className="w-5 h-5"/>} />
                    <InfoRow label="Site" value={<a href={`https://consultaca.com${data.manufacturer.site}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{data.manufacturer.site ? 'Visitar site' : 'N/A'}</a>} icon={<LinkIcon className="w-5 h-5"/>} />
                </dl>
            </Section>
            
            <Section title="Fotos do Equipamento">
                <div className="grid grid-cols-2 gap-4">
                {data.photos.length > 0 ? data.photos.map((photo, index) => (
                    <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} alt={`EPI Photo ${index + 1}`} className="rounded-lg object-cover w-full h-32 hover:opacity-80 transition-opacity" />
                    </a>
                )) : <p className="text-sm text-slate-500">Nenhuma foto disponível.</p>}
                </div>
            </Section>
            
            <Section title="Histórico do CA">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-4 py-2">Data</th>
                                <th scope="col" className="px-4 py-2">Ocorrência</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.history.map((item, index) => (
                                <tr key={index} className="bg-white border-b">
                                    <td className="px-4 py-2">{item.date}</td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{item.event}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
      </div>
    </div>
  );
};

export default CADetailCard;