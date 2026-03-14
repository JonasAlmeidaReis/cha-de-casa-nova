# Lista de Presentes - Firebase

## Requisitos
- Node.js 20+
- Projeto Firebase criado com `Authentication`, `Firestore` e `Storage`
- Firebase CLI instalado globalmente para deploy de regras e indices

## Setup local
1. Copie `.env.example` para `.env.local` e preencha as variaveis `NEXT_PUBLIC_FIREBASE_*`.
2. Rode `npm install`.
3. Rode `npm run dev`.

## Configuracoes no Firebase Console
1. Em `Authentication > Sign-in method`, habilite `Email/Password`.
2. Crie os usuarios admin (noivos) manualmente no Auth.
3. Crie o documento `users/{uid}` de cada admin com:
   - `displayName` (string)
   - `email` (string)
   - `role` = `"admin"`
   - `createdAt` / `updatedAt` (timestamp)
4. Em `Authentication > Settings > Authorized domains`, adicione:
   - `localhost`
   - seu dominio da Vercel

## Deploy de regras e indices
- `npm run firebase:deploy-rules`

Esse comando faz deploy apenas de:
- Firestore rules
- Firestore indexes
- Storage rules

Nao inclui Firebase Hosting e nem Cloud Functions.

