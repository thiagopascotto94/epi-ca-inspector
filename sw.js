import{g as U,c as g,u as r,G as C,f as P,b as w,T as t}from"./assets/apiService-DculNzNM.js";let y=!1,S=null;const s=new Set;self.addEventListener("install",a=>{console.log("Service Worker: Installing..."),a.waitUntil(self.skipWaiting())});self.addEventListener("activate",a=>{console.log("Service Worker: Activating..."),a.waitUntil(self.clients.claim())});self.addEventListener("notificationclick",a=>{a.notification.close(),a.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:!0}).then(o=>{for(const e of o)if("focus"in e)return e.focus();if(self.clients.openWindow)return self.clients.openWindow("/")}))});self.addEventListener("message",a=>{if(a.data&&a.data.type==="START_SIMILARITY_JOB"){const{jobId:o}=a.data.payload;console.log(`Service Worker: Received job ${o}, adding to queue.`),S=a.data.payload.apiKey,b()}else if(a.data&&a.data.type==="CANCEL_SIMILARITY_JOB"){const{jobId:o}=a.data.payload;console.log(`Service Worker: Received cancellation request for job ${o}.`),s.add(o)}});async function b(){if(y){console.log("SW: A job is already running. Queue will be processed after it completes.");return}if(!S){console.log("SW: API key not available. Waiting for a job to be initiated from the client app.");return}const o=(await U()).filter(e=>e.status==="pending").sort((e,c)=>e.createdAt-c.createdAt)[0];if(!o){console.log("SW: No pending jobs in the queue.");return}if(s.has(o.id)){console.log(`SW: Skipping cancelled pending job ${o.id}`),s.delete(o.id),setTimeout(b,0);return}y=!0,console.log(`SW: Starting job ${o.id}`),I(o.id,S).catch(e=>{console.error(`SW: Unhandled error in runSimilarityJob for ${o.id}`,e)}).finally(()=>{y=!1,console.log(`SW: Finished job processing for ${o.id}. Checking for next job.`),setTimeout(b,100)})}const A=async a=>{const o=await self.clients.matchAll({type:"window"});for(const e of o)e.postMessage({type:"JOB_UPDATED",payload:{jobId:a}})};async function I(a,o){let e=await g(a);if(!e){console.error(`Job ${a} not found in IDB.`),s.delete(a);return}const c=()=>{s.delete(a)};try{if(s.has(a)){console.log(`Job ${a} was cancelled before starting.`),c();return}e.status="processing",e.progress=0,e.progressMessage="Iniciando análise...",await r(e),await A(e.id);const l=new C({apiKey:o}),{caData:i,libraryFiles:h,description:u,libraryName:$}=e,m=[],p=h.length;e.totalFiles=p,await r(e);for(let n=0;n<p;n++){if(s.has(a)){console.log(`Job ${a} cancelled during file processing.`),c();return}const d=h[n],N=await P(d.url),E=`
                Você é um especialista em EPIs. Analise o conteúdo do documento a seguir para encontrar um EPI similar ao EPI de Referência.
                
                **EPI de Referência (CA ${i.caNumber}):**
                \`\`\`json
                ${JSON.stringify({name:i.equipmentName,approvedFor:i.approvedFor,description:i.description},null,2)}
                \`\`\`
                ${u.trim()?`
                **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
                ${u.trim()}
                `:""}
                **Conteúdo do Documento (Fonte: ${d.url}):**
                ---
                ${N}
                ---
                
                **Sua Tarefa:**
                Se encontrar um EPI similar no documento, descreva-o sucintamente, incluindo seu nome/identificador e a principal razão da similaridade. Dê forte preferência à "Descrição Adicional" se ela for fornecida.
                Se nenhum similar for encontrado, responda "Nenhum EPI similar encontrado neste documento.".
                Seja breve e objetivo.
            `;try{const f=await w(l,{model:"gemini-2.5-flash",contents:E},3,T=>{e.progressMessage=`Analisando arquivo ${n+1}/${p} (Tentativa ${T}/3)...`,r(e)});m.push(`Análise do documento ${d.url}:
${f.text}`)}catch(f){console.error(`Failed to analyze file ${d.url} after retries:`,f),m.push(`[ERRO] A análise do documento ${d.url} falhou após múltiplas tentativas.`)}e.progress=n+1,await r(e),await A(e.id)}if(s.has(a)){console.log(`Job ${a} cancelled before final synthesis.`),c();return}const v=`
            Você é um especialista em segurança do trabalho. Sua tarefa é consolidar várias análises de documentos e apresentar os EPIs mais similares a um EPI de referência, retornando a resposta em formato JSON.

            **EPI de Referência (CA ${i.caNumber}):**
            \`\`\`json
            ${JSON.stringify(i,null,2)}
            \`\`\`
            ${u.trim()?`
            **Descrição Adicional Fornecida pelo Usuário (Critério de Alta Prioridade):**
            ${u.trim()}
            `:""}
            **Resultados das Análises Individuais dos Documentos:**
            ---
            ${m.join(`

---

`)}
            ---

            **Instruções Finais:**
            1.  Com base nos resultados individuais, identifique até **5 EPIs mais similares** ao de referência.
            2.  **Dê prioridade máxima à "Descrição Adicional" do usuário ao classificar a similaridade.**
            3.  Ordene-os do mais similar para o menos similar na sua resposta final.
            4.  Para cada sugestão, preencha todos os campos do schema JSON solicitado:
                - **justification**: Uma frase **curta e direta** resumindo o motivo da similaridade. Ex: "Ambos são calçados de segurança S3 com biqueira de composite."
                - **detailedJustification**: Uma análise mais completa em **Markdown**, explicando os prós e contras, comparando materiais, normas e indicações de uso. Use listas para clareza.
            5.  **Tente extrair a URL completa de uma imagem do produto se houver uma claramente associada a ele nos documentos.** Se não encontrar, deixe o campo em branco.
            6.  Se nenhum equipamento similar relevante foi encontrado em todas as análises, retorne um array JSON vazio.
        `,R={type:t.ARRAY,items:{type:t.OBJECT,properties:{productName:{type:t.STRING,description:"O nome, modelo ou identificador claro do produto similar encontrado."},caNumber:{type:t.STRING,description:"O número do Certificado de Aprovação (CA) do produto, se disponível."},confidence:{type:t.NUMBER,description:"Uma estimativa em porcentagem (0-100) de quão confiante você está na correspondência."},justification:{type:t.STRING,description:"Uma explicação CURTA e direta (uma frase) do porquê o item é similar."},detailedJustification:{type:t.STRING,description:"Uma análise detalhada em formato Markdown comparando os produtos, destacando prós, contras e diferenças."},imageUrl:{type:t.STRING,description:"A URL completa de uma imagem do produto, se encontrada nos documentos."}},required:["productName","confidence","justification","detailedJustification"]}},J=await w(l,{model:"gemini-2.5-flash",contents:v,config:{responseMimeType:"application/json",responseSchema:R}},3,n=>{e.progressMessage=`Realizando síntese final (Tentativa ${n}/3)...`,r(e)});e.status="completed",e.result=J.text,e.completedAt=Date.now(),e.progress=e.totalFiles,e.progressMessage="Finalizado",await r(e),await self.registration.showNotification("Busca de Similaridade Concluída",{body:`A busca para o CA ${i.caNumber} na biblioteca '${$}' foi finalizada. Clique para ver.`,icon:"/favicon.ico",tag:a})}catch(l){console.error(`Error processing job ${a}:`,l);let i=await g(a);i&&(i.status="failed",i.error=l.message||"Ocorreu um erro desconhecido.",i.completedAt=Date.now(),await r(i),await self.registration.showNotification("Busca de Similaridade Falhou",{body:`A busca para o CA ${e.caData.caNumber} encontrou um erro.`,icon:"/favicon.ico",tag:a}))}finally{await g(a)&&await A(a),c()}}
