import React from 'react';
import Joyride, { Step } from 'react-joyride-react-19';

interface OnboardingJoyrideProps {
    run: boolean;
    callback: (data: any) => void;
}

export const OnboardingJoyride: React.FC<OnboardingJoyrideProps> = ({ run, callback }) => {
    const steps: Step[] = [
        {
            target: '#ca-input',
            content: 'Comece por aqui! Digite o número do Certificado de Aprovação (CA) que você deseja consultar.',
            placement: 'bottom',
            title: 'Consulta de CA',
        },
        {
            target: '#compare-toggle',
            content: 'Você pode comparar dois CAs. Marque esta caixa para habilitar a busca por um segundo CA.',
            placement: 'bottom',
            title: 'Comparar CAs',
        },
        {
            target: '#ai-analysis-button',
            content: 'Depois de buscar dois CAs, você pode usar a nossa IA para fazer uma análise comparativa detalhada.',
            placement: 'bottom',
            title: 'Análise com IA',
        },
        {
            target: '#library-link',
            content: 'Visite a Biblioteca de Conhecimento para criar e gerenciar seus próprios modelos de EPIs e acessar modelos prontos.',
            placement: 'bottom',
            title: 'Biblioteca de Conhecimento',
        }
    ];

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={callback}
            styles={{
                options: {
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    primaryColor: '#0ea5e9',
                    textColor: '#333',
                    zIndex: 1000,
                }
            }}
        />
    );
};
