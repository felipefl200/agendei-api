# Tarefa 08 - Epic 03 - Auth

## Status

Concluida em 2026-06-10.

## Alteracoes implementadas

- Criado o modulo `auth` com as rotas `POST /auth/register`, `POST /auth/login` e `GET /auth/me`.
- Adicionados schemas Zod v4 para cadastro de paciente e login, incluindo normalizacao de e-mail.
- Implementado cadastro de paciente com criacao transacional em `users` e `patients`.
- Implementado hash e verificacao de senha com Argon2id.
- Implementada emissao de JWT contendo `sub` e `role`.
- Criados os middlewares `authenticate` e `authorize`.
- Garantido retorno seguro de usuario sem `passwordHash`.
- Adicionadas as variaveis `JWT_SECRET` e `JWT_EXPIRES_IN` ao ambiente.
- Adicionado tratamento de erros Zod no handler HTTP global.
- Refatorado o caso de uso de auth para depender de ports internos do modulo, removendo dependencias diretas de Drizzle e JWT do service.
- Movidas as implementacoes concretas de Drizzle, Argon2id e JWT para adapters/composicao do modulo.

## Testes

- Criado ambiente de testes com Vitest usando `vitest.config.ts`.
- Adicionados scripts `test` e `test:watch`.
- Criado `src/tests/setup-env.ts` para variaveis obrigatorias em ambiente de teste.
- Adicionados testes para schemas, hash Argon2id, middlewares e rotas de auth.
- Adicionado `auth.service.test.ts` com fakes in-memory para cobrir regras do caso de uso sem banco de dados.

## Criterios de aceite validados

- Paciente consegue criar conta via `POST /auth/register`.
- Usuario consegue fazer login via `POST /auth/login`.
- Login invalido retorna `401`.
- Token valido acessa `GET /auth/me`.
- Token invalido retorna `401`.
- `passwordHash` nao e retornado pela API.
- JWT contem `sub` e `role`.
- Caso de uso bloqueia e-mail duplicado antes de hash/transacao/token.
- Caso de uso rejeita login de usuario inativo.
- Login valido atualiza `lastLoginAt`.
- Falha na criacao do paciente reverte a criacao do usuario no fake transacional.

## Verificacao executada

Todos os comandos foram executados dentro do WSL2 apos confirmacao com `uname -a`.

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Resultado dos testes: 4 arquivos de teste e 13 testes passaram.

## Documentacao consultada

- Vitest Getting Started: https://vitest.dev/guide/
- Vitest Config Reference: https://vitest.dev/config/
- Vitest Mocking Modules: https://vitest.dev/guide/mocking/modules
