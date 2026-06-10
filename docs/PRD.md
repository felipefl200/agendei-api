# PRD — API Agendei

## 1. Visão geral

O **Agendei** é um aplicativo mobile para agendamento de consultas médicas. A API será responsável por centralizar as regras de negócio, autenticação, cadastro de usuários, listagem de médicos, especialidades, horários disponíveis, criação de agendamentos, histórico de consultas e notificações.

O objetivo é criar uma API segura, escalável e bem organizada, servindo como base para o aplicativo mobile e, futuramente, para um painel web administrativo.

---

## 2. Objetivo do produto

Criar uma API REST para permitir que pacientes consigam:

- Criar conta e autenticar-se.
- Visualizar médicos disponíveis.
- Filtrar médicos por especialidade.
- Consultar horários disponíveis.
- Agendar consultas.
- Visualizar próximas consultas.
- Consultar histórico de atendimentos.
- Cancelar consultas quando permitido.
- Gerenciar informações básicas do perfil.
- Receber notificações relacionadas aos agendamentos.

Além disso, a API deve permitir que administradores ou responsáveis pelo sistema consigam:

- Cadastrar médicos.
- Cadastrar especialidades.
- Definir horários de atendimento.
- Gerenciar consultas.
- Consultar pacientes.
- Controlar status dos agendamentos.

---

## 3. Público-alvo

### Paciente

Usuário final do aplicativo mobile que deseja agendar consultas médicas de forma simples e rápida.

### Médico

Profissional de saúde que possui agenda cadastrada no sistema e recebe consultas agendadas.

### Administrador

Usuário interno responsável por manter médicos, especialidades, horários e configurações da plataforma.

---

## 4. Problema a ser resolvido

Hoje muitos sistemas de agendamento médico são pouco intuitivos, dependem de contato manual, telefone ou mensagens, e não oferecem uma experiência clara para o paciente.

A API do Agendei deve resolver:

- Falta de centralização dos horários disponíveis.
- Dificuldade para encontrar médicos por especialidade.
- Falta de histórico organizado de consultas.
- Ausência de validação contra agendamento duplicado.
- Falta de padronização nos dados entre mobile e backend.
- Necessidade futura de painel administrativo.

---

## 5. Escopo do MVP

O MVP da API deve conter:

- Autenticação de pacientes.
- Cadastro de pacientes.
- Login com e-mail e senha.
- Perfil do paciente autenticado.
- Listagem de especialidades.
- Listagem de médicos.
- Filtro de médicos por especialidade.
- Detalhes do médico.
- Horários disponíveis por médico e data.
- Criação de agendamento.
- Listagem de próximas consultas.
- Histórico de consultas.
- Cancelamento de consulta.
- Status da consulta.
- Seed inicial de especialidades e médicos.
- Documentação básica da API.

---

## 6. Fora do escopo inicial

Não faz parte do MVP:

- Pagamento online.
- Telemedicina.
- Chat em tempo real.
- Upload de exames.
- Prontuário médico completo.
- Integração com convênios reais.
- Confirmação por WhatsApp.
- Login social com Google/Apple.
- Painel administrativo completo.
- Avaliação de médicos.
- Reagendamento automático.
- Multi-clínicas complexo.

Esses itens podem ser considerados em versões futuras.

---

## 7. Entidades principais

## 7.1 User / Patient

Representa o paciente que utiliza o app.

### Campos sugeridos

```ts
type Patient = {
  id: string
  name: string
  email: string
  phone?: string
  birthDate?: string
  passwordHash: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

---

## 7.2 Doctor

Representa o médico disponível para consulta.

### Campos sugeridos

```ts
type Doctor = {
  id: string
  name: string
  crm: string
  email?: string
  phone?: string
  avatarUrl?: string
  bio?: string
  specialtyId: string
  clinicId?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 7.3 Specialty

Representa uma especialidade médica.

### Campos sugeridos

```ts
type Specialty = {
  id: string
  name: string
  description?: string
  icon?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

Exemplos:

- Clínica Geral
- Cardiologia
- Pediatria
- Ginecologia
- Dermatologia
- Ortopedia

---

## 7.4 Clinic

Representa uma clínica ou local de atendimento.

### Campos sugeridos

```ts
type Clinic = {
  id: string
  name: string
  address: string
  phone?: string
  latitude?: number
  longitude?: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 7.5 Appointment

Representa uma consulta agendada.

### Campos sugeridos

```ts
type Appointment = {
  id: string
  patientId: string
  doctorId: string
  clinicId?: string
  specialtyId: string
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  cancelReason?: string
  createdAt: Date
  updatedAt: Date
}
```

### Status possíveis

```ts
type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'canceled'
  | 'no_show'
```

---

## 7.6 DoctorAvailability

Representa os horários de atendimento de um médico.

### Campos sugeridos

```ts
type DoctorAvailability = {
  id: string
  doctorId: string
  weekday: number
  startTime: string
  endTime: string
  slotDurationInMinutes: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

Exemplo:

```json
{
  "weekday": 1,
  "startTime": "08:00",
  "endTime": "12:00",
  "slotDurationInMinutes": 30
}
```

---

## 8. Regras de negócio

## 8.1 Cadastro de paciente

- O e-mail deve ser único.
- A senha deve ser armazenada com hash.
- A senha nunca deve ser retornada pela API.
- Nome e e-mail são obrigatórios.
- Telefone pode ser obrigatório se a regra do negócio exigir confirmação.

---

## 8.2 Login

- O usuário deve autenticar usando e-mail e senha.
- Em caso de sucesso, a API deve retornar um access token.
- O token deve ser usado nas rotas protegidas.
- A resposta não deve retornar `passwordHash`.

---

## 8.3 Listagem de médicos

- A API deve listar apenas médicos ativos.
- Deve ser possível filtrar por especialidade.
- Deve ser possível buscar por nome.
- Médicos sem agenda ativa podem aparecer, mas devem indicar indisponibilidade.
- No MVP, priorizar médicos com horários disponíveis.

---

## 8.4 Horários disponíveis

A API deve calcular os horários disponíveis com base em:

- Agenda semanal do médico.
- Consultas já agendadas.
- Duração padrão do atendimento.
- Data selecionada.
- Status das consultas existentes.

Não devem aparecer horários ocupados por consultas com status:

- `scheduled`
- `confirmed`

Consultas canceladas devem liberar o horário.

---

## 8.5 Criação de consulta

Para criar uma consulta:

- O paciente precisa estar autenticado.
- O médico precisa estar ativo.
- A especialidade precisa estar ativa.
- O horário precisa estar disponível.
- Não pode existir outra consulta ativa no mesmo médico, data e horário.
- O paciente não deve conseguir criar duas consultas no mesmo horário.
- A consulta deve iniciar com status `scheduled` ou `confirmed`, conforme regra definida.

Recomendação para MVP:

```txt
Criar consulta com status: scheduled
```

---

## 8.6 Cancelamento de consulta

- O paciente pode cancelar apenas consultas futuras.
- Consultas concluídas não podem ser canceladas.
- Consultas canceladas devem ficar no histórico.
- O cancelamento pode exigir motivo.
- O horário cancelado volta a ficar disponível.

Regra sugerida:

```txt
Permitir cancelamento até 2 horas antes da consulta.
```

---

## 8.7 Histórico

O histórico deve exibir consultas com status:

- `completed`
- `canceled`
- `no_show`

As próximas consultas devem exibir:

- `scheduled`
- `confirmed`

---

## 9. Perfis de acesso

## 9.1 Paciente

Pode:

- Criar conta.
- Fazer login.
- Ver o próprio perfil.
- Atualizar o próprio perfil.
- Listar especialidades.
- Listar médicos.
- Consultar horários disponíveis.
- Criar agendamento.
- Ver próprias consultas.
- Cancelar próprias consultas.

Não pode:

- Criar médicos.
- Alterar agenda de médicos.
- Ver consultas de outros pacientes.
- Alterar status manualmente para concluído.

---

## 9.2 Admin

Pode:

- Criar médicos.
- Editar médicos.
- Desativar médicos.
- Criar especialidades.
- Editar especialidades.
- Criar horários de atendimento.
- Visualizar consultas.
- Alterar status de consultas.
- Cadastrar clínicas.

---

## 10. Endpoints do MVP

## 10.1 Health check

### `GET /health`

Verifica se a API está online.

### Resposta

```json
{
  "status": "ok",
  "timestamp": "2026-06-09T10:00:00.000Z"
}
```

---

## 10.2 Autenticação

### `POST /auth/register`

Cria uma conta de paciente.

### Body

```json
{
  "name": "Ana Carolina",
  "email": "ana@email.com",
  "phone": "(11) 99999-9999",
  "password": "12345678"
}
```

### Resposta

```json
{
  "user": {
    "id": "uuid",
    "name": "Ana Carolina",
    "email": "ana@email.com",
    "phone": "(11) 99999-9999"
  },
  "accessToken": "jwt-token"
}
```

---

### `POST /auth/login`

Autentica o paciente.

### Body

```json
{
  "email": "ana@email.com",
  "password": "12345678"
}
```

### Resposta

```json
{
  "user": {
    "id": "uuid",
    "name": "Ana Carolina",
    "email": "ana@email.com"
  },
  "accessToken": "jwt-token"
}
```

---

### `GET /auth/me`

Retorna o usuário autenticado.

### Headers

```txt
Authorization: Bearer jwt-token
```

### Resposta

```json
{
  "id": "uuid",
  "name": "Ana Carolina",
  "email": "ana@email.com",
  "phone": "(11) 99999-9999"
}
```

---

## 10.3 Paciente

### `PATCH /patients/me`

Atualiza o perfil do paciente autenticado.

### Body

```json
{
  "name": "Ana Carolina",
  "phone": "(11) 98888-7777"
}
```

---

## 10.4 Especialidades

### `GET /specialties`

Lista especialidades ativas.

### Resposta

```json
[
  {
    "id": "uuid",
    "name": "Clínica Geral",
    "description": "Atendimento médico geral",
    "icon": "stethoscope"
  },
  {
    "id": "uuid",
    "name": "Cardiologia",
    "description": "Cuidados com o coração",
    "icon": "heart-pulse"
  }
]
```

---

### `POST /admin/specialties`

Cria especialidade.

### Permissão

Admin.

### Body

```json
{
  "name": "Dermatologia",
  "description": "Cuidados com a pele",
  "icon": "sparkles"
}
```

---

## 10.5 Médicos

### `GET /doctors`

Lista médicos ativos.

### Query params

```txt
?specialtyId=uuid
?search=juliana
```

### Resposta

```json
[
  {
    "id": "uuid",
    "name": "Dra. Juliana Martins",
    "crm": "CRM/SP 123456",
    "avatarUrl": "https://...",
    "specialty": {
      "id": "uuid",
      "name": "Clínica Geral"
    },
    "clinic": {
      "id": "uuid",
      "name": "Clínica Saúde & Vida"
    },
    "availableToday": true
  }
]
```

---

### `GET /doctors/:id`

Retorna detalhes do médico.

### Resposta

```json
{
  "id": "uuid",
  "name": "Dra. Juliana Martins",
  "crm": "CRM/SP 123456",
  "bio": "Médica clínica geral com foco em atendimento preventivo.",
  "avatarUrl": "https://...",
  "specialty": {
    "id": "uuid",
    "name": "Clínica Geral"
  },
  "clinic": {
    "id": "uuid",
    "name": "Clínica Saúde & Vida",
    "address": "Rua Exemplo, 123"
  }
}
```

---

### `POST /admin/doctors`

Cria médico.

### Permissão

Admin.

### Body

```json
{
  "name": "Dra. Juliana Martins",
  "crm": "CRM/SP 123456",
  "email": "juliana@clinica.com",
  "specialtyId": "uuid",
  "clinicId": "uuid",
  "bio": "Médica clínica geral."
}
```

---

## 10.6 Disponibilidade de médicos

### `GET /doctors/:doctorId/available-slots`

Lista horários disponíveis para uma data.

### Query params

```txt
?date=2026-06-10
```

### Resposta

```json
{
  "doctorId": "uuid",
  "date": "2026-06-10",
  "slots": [
    {
      "time": "08:00",
      "available": true
    },
    {
      "time": "08:30",
      "available": true
    },
    {
      "time": "09:00",
      "available": false
    }
  ]
}
```

---

### `POST /admin/doctors/:doctorId/availability`

Cria regra de disponibilidade para o médico.

### Permissão

Admin.

### Body

```json
{
  "weekday": 1,
  "startTime": "08:00",
  "endTime": "12:00",
  "slotDurationInMinutes": 30
}
```

---

## 10.7 Agendamentos

### `POST /appointments`

Cria uma consulta.

### Permissão

Paciente autenticado.

### Body

```json
{
  "doctorId": "uuid",
  "specialtyId": "uuid",
  "clinicId": "uuid",
  "date": "2026-06-10",
  "startTime": "10:30"
}
```

### Resposta

```json
{
  "id": "uuid",
  "doctor": {
    "id": "uuid",
    "name": "Dra. Juliana Martins"
  },
  "specialty": {
    "id": "uuid",
    "name": "Clínica Geral"
  },
  "clinic": {
    "id": "uuid",
    "name": "Clínica Saúde & Vida"
  },
  "date": "2026-06-10",
  "startTime": "10:30",
  "endTime": "11:00",
  "status": "scheduled"
}
```

---

### `GET /appointments/upcoming`

Lista próximas consultas do paciente autenticado.

### Resposta

```json
[
  {
    "id": "uuid",
    "doctorName": "Dra. Juliana Martins",
    "specialtyName": "Clínica Geral",
    "clinicName": "Clínica Saúde & Vida",
    "date": "2026-06-10",
    "startTime": "10:30",
    "status": "scheduled"
  }
]
```

---

### `GET /appointments/history`

Lista histórico de consultas do paciente autenticado.

### Resposta

```json
[
  {
    "id": "uuid",
    "doctorName": "Dra. Beatriz Nunes",
    "specialtyName": "Ginecologia",
    "clinicName": "Clínica Feminina",
    "date": "2026-04-12",
    "startTime": "10:00",
    "status": "completed"
  }
]
```

---

### `GET /appointments/:id`

Retorna detalhes da consulta.

### Resposta

```json
{
  "id": "uuid",
  "doctor": {
    "id": "uuid",
    "name": "Dra. Juliana Martins",
    "crm": "CRM/SP 123456"
  },
  "specialty": {
    "id": "uuid",
    "name": "Clínica Geral"
  },
  "clinic": {
    "id": "uuid",
    "name": "Clínica Saúde & Vida",
    "address": "Rua Exemplo, 123"
  },
  "date": "2026-06-10",
  "startTime": "10:30",
  "endTime": "11:00",
  "status": "scheduled"
}
```

---

### `PATCH /appointments/:id/cancel`

Cancela uma consulta do paciente autenticado.

### Body

```json
{
  "reason": "Não poderei comparecer"
}
```

### Resposta

```json
{
  "id": "uuid",
  "status": "canceled",
  "cancelReason": "Não poderei comparecer"
}
```

---

## 10.8 Notificações

### `GET /notifications`

Lista notificações do paciente autenticado.

### Resposta

```json
[
  {
    "id": "uuid",
    "title": "Consulta agendada",
    "message": "Sua consulta com Dra. Juliana Martins foi agendada para 10/06 às 10:30.",
    "read": false,
    "createdAt": "2026-06-09T10:00:00.000Z"
  }
]
```

---

### `PATCH /notifications/:id/read`

Marca notificação como lida.

---

## 11. Validações

## 11.1 Cadastro

- `name`: obrigatório, mínimo 3 caracteres.
- `email`: obrigatório, formato válido, único.
- `phone`: opcional no MVP, mas deve ser validado se informado.
- `password`: obrigatório, mínimo 8 caracteres.

---

## 11.2 Médico

- `name`: obrigatório.
- `crm`: obrigatório e único.
- `specialtyId`: obrigatório.
- `clinicId`: opcional no MVP.
- `active`: boolean.

---

## 11.3 Agendamento

- `doctorId`: obrigatório.
- `specialtyId`: obrigatório.
- `date`: obrigatório.
- `startTime`: obrigatório.
- Data não pode ser anterior ao dia atual.
- Horário precisa existir na agenda do médico.
- Horário não pode estar ocupado.
- Paciente não pode ter outra consulta no mesmo horário.

---

## 12. Respostas de erro

A API deve retornar erros padronizados.

### Exemplo

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Horário indisponível"
}
```

### Códigos comuns

| Código | Uso                     |
| -----: | ----------------------- |
|    400 | Erro de validação       |
|    401 | Usuário não autenticado |
|    403 | Usuário sem permissão   |
|    404 | Recurso não encontrado  |
|    409 | Conflito de dados       |
|    500 | Erro interno            |

---

## 13. Requisitos não funcionais

## 13.1 Segurança

- Senhas devem ser salvas com hash.
- Rotas privadas devem exigir JWT.
- Dados sensíveis não devem ser retornados.
- A API deve usar validação de entrada.
- Deve haver proteção contra payloads inválidos.
- Em produção, usar HTTPS.
- Não expor stack trace em resposta de erro.

---

## 13.2 Performance

- Listagem de médicos deve ter paginação.
- Busca por médicos deve usar índice no banco.
- Horários disponíveis devem ser calculados de forma eficiente.
- Consultas futuras e histórico devem usar filtros por data/status.

---

## 13.3 Escalabilidade

A arquitetura deve permitir evolução para:

- Painel administrativo.
- Multi-clínicas.
- Notificações push.
- Integração com pagamento.
- Integração com convênios.
- Telemedicina.
- Upload de documentos.

---

## 13.4 Observabilidade

- Logs de erro.
- Logs de criação/cancelamento de consulta.
- Monitoramento de rotas críticas.
- Health check.
- Registro de falhas de autenticação.

---

## 14. Stack técnica sugerida

## 14.1 API

Sugestão principal:

- Node.js
- TypeScript
- Fastify ou NestJS
- Drizzle ORM
- PostgreSQL
- JWT
- Zod para validação
- Docker para ambiente local

Sugestão alternativa mais simples:

- Node.js
- TypeScript
- Express
- Drizzle ORM
- PostgreSQL
- JWT
- Zod

---

## 15. Arquitetura recomendada

A API deve evitar estrutura baseada apenas em controllers grandes. A sugestão é usar separação por camadas:

```txt
src
├── modules
│   ├── auth
│   ├── patients
│   ├── doctors
│   ├── specialties
│   ├── appointments
│   └── notifications
├── shared
│   ├── database
│   ├── errors
│   ├── middlewares
│   ├── validators
│   └── utils
└── server.ts
```

Cada módulo pode ter:

```txt
appointments
├── appointment.controller.ts
├── appointment.service.ts
├── appointment.repository.ts
├── appointment.schema.ts
└── appointment.routes.ts
```

---

## 16. Banco de dados sugerido

## 16.1 Tabelas principais

- `patients`
- `doctors`
- `specialties`
- `clinics`
- `doctor_availabilities`
- `appointments`
- `notifications`
- `admins`

---

## 16.2 Relacionamentos

```txt
Patient 1:N Appointment
Doctor 1:N Appointment
Specialty 1:N Doctor
Specialty 1:N Appointment
Clinic 1:N Doctor
Clinic 1:N Appointment
Doctor 1:N DoctorAvailability
Patient 1:N Notification
```

---

## 17. Fluxo principal de agendamento

```txt
1. Paciente faz login.
2. App busca especialidades.
3. Paciente seleciona uma especialidade.
4. App lista médicos disponíveis.
5. Paciente escolhe médico.
6. App busca horários disponíveis por data.
7. Paciente escolhe data e horário.
8. API valida disponibilidade.
9. API cria agendamento.
10. API retorna consulta criada.
11. App exibe confirmação.
12. API gera notificação para o paciente.
```

---

## 18. Critérios de aceite

## 18.1 Cadastro e login

- Deve permitir criar conta com nome, e-mail, telefone e senha.
- Não deve permitir e-mail duplicado.
- Deve permitir login com credenciais válidas.
- Deve bloquear login com senha incorreta.
- Deve retornar token JWT em login válido.

---

## 18.2 Médicos e especialidades

- Deve listar especialidades ativas.
- Deve listar médicos ativos.
- Deve filtrar médicos por especialidade.
- Deve retornar detalhes do médico.
- Deve indicar disponibilidade básica.

---

## 18.3 Agendamento

- Deve listar horários disponíveis para médico e data.
- Não deve permitir agendar horário ocupado.
- Não deve permitir agendar data passada.
- Deve criar consulta com status inicial.
- Deve listar próximas consultas.
- Deve listar histórico de consultas.
- Deve permitir cancelamento conforme regra definida.

---

## 18.4 Segurança

- Rotas privadas devem rejeitar requisições sem token.
- Paciente não deve acessar consultas de outro paciente.
- Admin deve acessar rotas administrativas.
- Senha não deve aparecer nas respostas.

---

## 19. Roadmap sugerido

## Fase 1 — MVP

- Auth
- Pacientes
- Especialidades
- Médicos
- Agenda
- Agendamentos
- Histórico
- Cancelamento
- Documentação

## Fase 2 — Administração

- CRUD de médicos
- CRUD de especialidades
- CRUD de clínicas
- Gestão de horários
- Gestão de consultas
- Painel web

## Fase 3 — Experiência do paciente

- Notificações push
- Esqueci minha senha
- Favoritos
- Avaliações
- Reagendamento
- Confirmação de presença

## Fase 4 — Produto avançado

- Convênios
- Pagamentos
- Telemedicina
- Upload de exames
- Prontuário básico
- Multi-clínicas

---

## 20. Métricas de sucesso

- Número de cadastros realizados.
- Número de consultas agendadas.
- Taxa de cancelamento.
- Taxa de comparecimento.
- Tempo médio para concluir um agendamento.
- Número de médicos ativos.
- Número de horários disponíveis.
- Erros de agendamento por conflito.
- Retenção de pacientes.

---

## 21. Riscos

| Risco                           | Impacto | Mitigação                        |
| ------------------------------- | ------- | -------------------------------- |
| Agendamento duplicado           | Alto    | Criar restrição única no banco   |
| Dados sensíveis expostos        | Alto    | DTOs seguros e autenticação      |
| Agenda médica inconsistente     | Alto    | Centralizar regra no backend     |
| Crescimento de regras médicas   | Médio   | Arquitetura modular              |
| Mobile depender de lógica local | Médio   | Backend deve validar tudo        |
| Falta de painel admin           | Médio   | Preparar rotas admin desde o MVP |

---

## 22. Decisões recomendadas

- A regra de disponibilidade deve ficar na API, não no app.
- O app deve apenas consumir horários já calculados.
- A API deve ser responsável por impedir conflitos.
- Usar tokens semânticos no retorno, como `scheduled`, `confirmed`, `completed`.
- Não retornar senha ou dados sensíveis.
- Criar paginação desde o início nas listagens principais.
- Criar arquitetura modular desde o primeiro commit.
- Priorizar regras de agendamento antes de funcionalidades visuais.

---

## 23. Definição de pronto

A API MVP será considerada pronta quando:

- Usuário consegue criar conta.
- Usuário consegue fazer login.
- App consegue carregar especialidades.
- App consegue carregar médicos.
- App consegue buscar horários disponíveis.
- App consegue criar uma consulta.
- App consegue listar próximas consultas.
- App consegue listar histórico.
- App consegue cancelar consulta.
- Regras de conflito funcionam corretamente.
- Rotas privadas exigem autenticação.
- Documentação básica está disponível.
- Testes das regras críticas estão implementados.
