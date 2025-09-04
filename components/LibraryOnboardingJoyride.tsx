import React from 'react';
import Joyride, { Step } from 'react-joyride-react-19';

interface LibraryOnboardingJoyrideProps {
    run: boolean;
    callback: (data: any) => void;
}

export const LibraryOnboardingJoyride: React.FC<LibraryOnboardingJoyrideProps> = ({ run, callback }) => {
    const steps: Step[] = [
        {
            target: '#create-library-button',
            content: 'Crie suas próprias bibliotecas de conhecimento para usar nas análises de IA. Você pode adicionar arquivos de texto, e em breve, outros formatos.',
            placement: 'bottom',
            title: 'Crie sua Biblioteca',
        },
        {
            target: '#my-libraries-section',
            content: 'Aqui você encontra todas as suas bibliotecas de conhecimento. Você pode gerenciá-las, adicionar novos arquivos e usá-las nas análises.',
            placement: 'top',
            title: 'Minhas Bibliotecas',
        },
        {
            target: '#available-templates-section',
            content: 'Nós preparamos alguns modelos de bibliotecas prontos para você usar. Eles contêm informações sobre EPIs de diversos fabricantes.',
            placement: 'top',
            title: 'Modelos Disponíveis',
        },
        {
            target: '#import-template-button',
            content: 'Para usar um modelo, basta clicar em "Importar". Ele será adicionado à sua lista de bibliotecas e você poderá usá-lo imediatamente.',
            placement: 'top',
            title: 'Importar Modelo',
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
