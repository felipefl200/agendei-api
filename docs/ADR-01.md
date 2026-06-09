# ADR 0001 — Arquitetura inicial da API Agendei

## Status

Aceito

## Contexto

O projeto Agendei precisa de uma API para atender o aplicativo mobile de agendamento médico. A API será responsável por autenticação, gerenciamento de pacientes, médicos, administradores, especialidades, disponibilidades, agendamentos e regras de conflito de horários.

O projeto atual já possui base com Fastify, e a nova API deve manter uma estrutura modular, simples de evoluir e compatível com desenvolvimento local via Docker.

## Decisão

A API será construída com:

```txt
Node.js + TypeScript
Fastify
Prisma ORM
MySQL
JWT
Zod v4
Docker para desenvolvimento
Arquitetura modular
```

## Stack definida

### Runtime

```txt
Node.js
```

### Linguagem

```txt
TypeScript
```

### Framework HTTP

```txt
Fastify
```

Motivo:

- O projeto já utiliza Fastify.
- Boa performance.
- Baixa complexidade.
- Fácil composição por plugins e rotas.
- Boa integração com validação e middlewares.

### ORM

```txt
Prisma ORM
```

Motivo:

- Migrations organizadas.
- Tipagem gerada automaticamente.
- Boa produtividade com TypeScript.
- Facilita manutenção do schema.

### Banco de dados

```txt
MySQL
```

Motivo:

- O servidor atual já utiliza MySQL.
- Reduz risco operacional no deploy.
- Evita mudança de infraestrutura neste momento.
- Prisma possui suporte adequado para MySQL.

### Autenticação

```txt
JWT
```

A autenticação será básica, usando e-mail e senha.

Perfis suportados:

```txt
patient
doctor
admin
```

O token JWT deve conter, no mínimo:

```ts
type JwtPayload = {
  sub: string
  role: 'patient' | 'doctor' | 'admin'
}
```

### Validação

```txt
Zod v4
```

Todas as entradas da API devem ser validadas com Zod.

Exemplos:

- Body de cadastro.
- Body de login.
- Query params.
- Params de rota.
- Dados de criação de agendamento.
- Dados administrativos.

### Ambiente de desenvolvimento

```txt
Docker
```

O Docker será usado para subir serviços locais, principalmente:

```txt
MySQL
```

A API pode rodar localmente fora do Docker no início, consumindo o MySQL via container.

## Separação por módulos

A API será separada por módulos de domínio:

```txt
src
├── modules
│   ├── auth
│   ├── patients
│   ├── doctors
│   ├── admins
│   ├── specialties
│   ├── availability
│   ├── appointments
│   └── notifications
├── shared
│   ├── database
│   ├── errors
│   ├── http
│   ├── middlewares
│   ├── plugins
│   └── utils
├── app.ts
└── server.ts
```

Cada módulo deve seguir, quando necessário:

```txt
module
├── module.routes.ts
├── module.controller.ts
├── module.service.ts
├── module.repository.ts
├── module.schema.ts
└── module.types.ts
```

## Regras arquiteturais

## Controllers

Responsáveis por:

- Receber requisição.
- Validar entrada.
- Chamar service.
- Retornar resposta HTTP.

Não devem conter regra de negócio complexa.

## Services

Responsáveis por:

- Regras de negócio.
- Orquestração de casos de uso.
- Validação de permissões de domínio.
- Verificação de disponibilidade.
- Criação/cancelamento de agendamento.

## Repositories

Responsáveis por:

- Acesso ao banco de dados.
- Consultas com Prisma.
- Persistência.
- Isolamento da camada de dados.

## Schemas

Responsáveis por:

- Validação com Zod.
- Tipagem derivada dos schemas.
- Contrato de entrada das rotas.

## Autorização por perfil

A API terá middleware para autenticação e autorização.

Exemplo de uso esperado:

```ts
app.get(
  '/admin/doctors',
  {
    preHandler: [authenticate, authorize(['admin'])],
  },
  controller.index,
)
```

## Regras de negócio críticas

A regra mais importante do sistema será o controle de conflitos de agendamento.

A API deve impedir:

- Médico com duas consultas no mesmo horário.
- Paciente com duas consultas no mesmo horário.
- Agendamento em data passada.
- Agendamento fora da disponibilidade do médico.
- Agendamento para médico inativo.
- Agendamento para especialidade inativa.
- Cancelamento de consulta já finalizada.

## Consequências positivas

- Arquitetura simples e evolutiva.
- Baixo acoplamento entre rotas e banco.
- Facilidade para testar regras de negócio.
- Boa compatibilidade com app mobile.
- Alinhamento com infraestrutura existente em MySQL.
- Facilidade para criar painel administrativo futuramente.

## Consequências negativas

- MySQL exige atenção extra em regras avançadas de índice parcial.
- Controle de conflito de consultas ativas não será tão simples quanto em bancos com índices parciais nativos.
- Será necessário reforçar validação transacional na aplicação para evitar race condition em agendamentos simultâneos.

## Decisão sobre conflito de agendamento

Como o banco será MySQL, a API deve validar conflito antes de criar a consulta e executar a criação dentro de transação.

Regra recomendada:

```txt
Antes de criar uma consulta, verificar se já existe appointment ativo
para o mesmo doctorId, date e startTime.
```

Status considerados ativos:

```txt
scheduled
confirmed
```

Status que liberam horário:

```txt
canceled
completed
no_show
```

A criação do agendamento deve ser feita em transação para reduzir risco de conflito.

## Decisão final

A API Agendei será implementada com arquitetura modular usando Fastify, TypeScript, Prisma, MySQL, JWT, Zod v4 e Docker para desenvolvimento.

Essa decisão será revisitada se o projeto exigir multi-clínicas avançado, alta concorrência em agendamentos ou integrações externas complexas.
