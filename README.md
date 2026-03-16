# Lista de Presentes de Chá de Casa Nova

Aplicação web para organizar lista de presentes de chá de casa nova, evitando itens repetidos e centralizando toda a experiência dos convidados em um único lugar.

O projeto tem duas áreas:
- `Convidado`: cria conta, faz login, reserva presente e escolhe a forma de entrega (marketplace ou PIX).
- `Admin (casal)`: gerencia presentes, acompanha reservas, confirma recebimento de PIX e atualiza dados do evento.

## Principais funcionalidades

- Login e cadastro com Firebase Authentication.
- Controle de perfis por papel (`guest` e `admin`).
- Lista de presentes com imagem, valor, link e status.
- Reserva de presentes com validação transacional (evita dupla reserva).
- Fluxo de reserva via marketplace ou via PIX.
- Confirmação de recebimento de PIX no painel admin.
- Dashboard com métricas e últimas reservas em tempo real.
- Configurações do evento (nome do casal, data, história, local, chave PIX, WhatsApp e imagem de capa).

## Stack utilizada

- `Next.js 16 (App Router)`: estrutura da aplicação, roteamento e build.
- `React 19`: componentes client-side e interatividade das telas.
- `TypeScript`: tipagem da aplicação e dos modelos de dados.
- `Tailwind CSS 4`: estilização utilitária com tema customizado.
- `Firebase Authentication`: login/cadastro e sessão de usuários.
- `Cloud Firestore`: banco NoSQL em tempo real (`users`, `gifts`, `settings`).
- `Firebase Storage`: upload e entrega de imagens (presentes e foto do casal).
- `Firestore Rules + Storage Rules`: controle de acesso e segurança por papel.
- `Chart.js + react-chartjs-2`: gráfico de acompanhamento no dashboard admin.

## Arquitetura de dados (resumo)

- Coleção `users`: perfil público do usuário autenticado (`displayName`, `email`, `role`).
- Coleção `gifts`: catálogo de presentes e estado de reserva.
- Documento `settings/event`: configurações globais do evento.

## Como rodar localmente

### 1) Pré-requisitos

- Node.js 20+.
- npm.
- Projeto Firebase criado (Auth + Firestore + Storage).
- Firebase CLI (opcional, mas recomendado para publicar regras):
  - `npm install -g firebase-tools`

### 2) Instalar dependências

```bash
npm install
```

### 3) Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com as credenciais do seu app web no Firebase:

```bash
cp .env.example .env.local
```

Variáveis necessárias:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4) Habilitar serviços no Firebase

No console do Firebase:
- Ative `Authentication > Sign-in method > Email/Password`.
- Crie o banco em `Firestore Database`.
- Crie o bucket em `Storage`.

### 5) Publicar regras e índices

```bash
firebase login
firebase use <seu-projeto>
npm run firebase:deploy-rules
```

### 6) Rodar o projeto

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Bootstrap do primeiro admin

Por regra de segurança, o cadastro público sempre cria usuários como `guest`.
Para liberar o primeiro casal como admin:

1. Crie uma conta comum em `/cadastro`.
2. No Firebase Console, abra `Firestore Database > users`.
3. Encontre o documento do usuário (id = UID do Auth).
4. Altere o campo `role` de `guest` para `admin`.
5. Entre em `/admin/login` com esse usuário.