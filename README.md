# Anotações do Dia

Anotações compartilhadas entre todas as pessoas que acessam a plataforma.

- Quatro períodos: Café da manhã, Almoço, Café da tarde e Jantar.
- Funções A, B, C e D, com tópicos em um registro contínuo.
- Cada tópico é salvo separadamente no PostgreSQL para preservar inclusões simultâneas.
- Atualização automática a cada 10 segundos enquanto a página está visível.
- Alterações concorrentes do mesmo tópico são detectadas antes de sobrescrever dados.
- Todos com o link podem ler, adicionar, editar e excluir; não há autenticação.
- Anotações antigas permanecem no navegador e podem ser compartilhadas pelo botão de importação.
- Sem conexão, não é possível salvar alterações compartilhadas.

## Configuração na Vercel

Conectar um banco Neon ao projeto, disponibilizando DATABASE_URL nas variáveis de ambiente do servidor. A API cria a tabela filipe_notes automaticamente. A credencial fica somente no servidor. Usar preset Other, raiz do repositório e saída public definida em vercel.json.

O site abre no navegador e pode ser instalado como PWA no Android.
