# Agendei API

API REST do Agendei para cadastro de pacientes, autenticação JWT, catálogo médico, disponibilidade e agendamento de consultas.

## Stack

- Node.js + TypeScript
- Fastify
- Drizzle ORM
- MySQL
- Zod v4
- Vitest
- Docker Compose para o MySQL local

## Requisitos

- Node.js compatível com o projeto
- npm
- Docker e Docker Compose

## Configuração local

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env`:

```bash
cp .env.example .env
```

3. Suba o MySQL:

```bash
docker compose up -d
```

4. Aplique o schema no banco:

```bash
npm run db:push
```

5. Opcionalmente, rode a seed:

```bash
npm run db:seed
```

6. Inicie a API:

```bash
npm run dev
```

Por padrão, a API fica disponível em `http://localhost:3333`.

## Variáveis De Ambiente

| Variável | Exemplo | Descrição |
| --- | --- | --- |
| `NODE_ENV` | `development` | Ambiente de execução. |
| `PORT` | `3333` | Porta HTTP usada pelo servidor. |
| `HOST` | `0.0.0.0` | Host de bind do Fastify. |
| `DATABASE_URL` | `mysql://agendei:agendei@localhost:3306/agendei` | URL de conexão do MySQL usada pelo Drizzle. |
| `JWT_SECRET` | `change-me-to-a-secure-secret-with-at-least-32-characters` | Segredo usado para assinar/verificar JWTs. Use valor forte em produção. |
| `JWT_EXPIRES_IN` | `1d` | Expiração dos tokens JWT. |

## Scripts

```bash
npm run dev        # inicia a API em desenvolvimento
npm run build      # compila para dist
npm run start      # inicia a versão compilada
npm run typecheck  # valida TypeScript
npm run lint       # executa ESLint
npm run lint:fix   # corrige lint automaticamente quando possível
npm test           # executa testes
npm run db:generate # gera migrations do Drizzle
npm run db:push      # aplica schema no banco configurado
npm run db:seed      # limpa e popula dados de desenvolvimento
```

Nota: a seed atual popula especialidades, clínicas, médicos, disponibilidades, pacientes e agendamentos para desenvolvimento. Os usuários seedados usam `dummy-hash`, então não são credenciais reais de login pelo fluxo Argon2id.

## Autenticação

Rotas protegidas usam Bearer token:

```http
Authorization: Bearer <token>
```

O JWT contém:

```json
{
  "sub": "users.id",
  "role": "patient"
}
```

Perfis suportados: `patient`, `doctor`, `admin`, `super_admin`.

## Documentação Da API

A referência dos contratos para integração mobile está em [docs/API.md](docs/API.md).

Pontos importantes já alinhados com as decisões de desenvolvimento:

- As respostas usam objetos envelopados, por exemplo `{ "patient": ... }`, `{ "appointments": [...] }` ou `{ "doctor": ... }`.
- O paciente autenticado é resolvido por `request.user.id`, que representa `users.id`.
- O mobile nunca envia `patientId` para consultar, criar ou cancelar consultas.
- Horários ocupados são bloqueados somente por consultas `scheduled` e `confirmed`.
- Consultas `canceled`, `completed` e `no_show` liberam o slot.
- Cancelamento de consulta futura é validado por data + horário em `America/Sao_Paulo`.

## Erros

Erros de domínio retornam:

```json
{
  "statusCode": 409,
  "error": "AppError",
  "message": "Appointment time is already occupied"
}
```

Erros de validação Zod retornam:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
  "issues": []
}
```

Veja a seção de erros em [docs/API.md](docs/API.md#erros).

## Verificação

Antes de abrir PR, execute:

```bash
npm run typecheck
npm run lint
npm test
```
