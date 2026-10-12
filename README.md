# Anotações do Dia

Site estático para organizar anotações em tópicos por período do dia.

## O que inclui

- Café da manhã, almoço, café da tarde e jantar.
- Funções A, B, C e D em cada período.
- Adição, edição e exclusão de tópicos.
- Um único registro contínuo, sem divisão por datas.
- Salvamento automático no navegador com `localStorage`.
- Instalação no Android pela tela inicial e acesso offline após a primeira abertura.

## Publicar na Vercel

1. Extraia este ZIP e envie os arquivos para a raiz do repositório GitHub.
2. Na Vercel, conecte o repositório ou abra o projeto já conectado.
3. Use a raiz do repositório como Root Directory e o preset `Other`.
4. O arquivo `vercel.json` define `public` como diretório de saída. Não é necessário comando de build.
5. Faça push para a branch de produção configurada na Vercel.

## Armazenamento

As anotações ficam salvas no perfil do navegador em que foram escritas. Elas continuam no mesmo navegador após fechar a página, mas não sincronizam automaticamente com outro navegador ou dispositivo. Para essa sincronização seria necessário um banco de dados online e autenticação.

## Instalar no Android

Depois de publicar o site em HTTPS, abra o endereço no Chrome do Android, toque no menu `⋮` e escolha **Instalar app** ou **Adicionar à tela inicial**. O ícone abre a plataforma em tela cheia. As anotações permanecem no armazenamento local desse navegador/aparelho e ficam disponíveis offline depois da primeira abertura.
