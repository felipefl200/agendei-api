# API Agendei

Referência dos contratos REST implementados para integração com o app mobile.

## Base

Base local padrão:

```txt
http://localhost:3333
```

Todas as requisições com body devem usar:

```http
Content-Type: application/json
```

Rotas protegidas usam:

```http
Authorization: Bearer <token>
```

## Convenções

- Datas usam `YYYY-MM-DD`.
- Horários usam `HH:mm`.
- IDs são UUIDs.
- E-mails são normalizados para lowercase.
- Campos editáveis com `null` limpam o valor quando o schema permite `null`.
- Respostas são envelopadas. A API não retorna arrays diretamente.
- `request.user.id` representa `users.id`.
- O paciente do fluxo mobile é sempre inferido pelo JWT; não envie `patientId` no body ou na URL.
- Timezone de regra de negócio para cancelamento: `America/Sao_Paulo`.

## Status De Consulta

| Status | Uso |
| --- | --- |
| `scheduled` | Consulta criada e ainda não confirmada. Bloqueia slot. |
| `confirmed` | Consulta confirmada. Bloqueia slot. |
| `completed` | Consulta concluída. Vai para histórico e libera slot. |
| `canceled` | Consulta cancelada. Vai para histórico e libera slot. |
| `no_show` | Paciente não compareceu. Vai para histórico e libera slot. |

## Autenticação

### POST /auth/register

Cria um usuário `patient`, cria o perfil em `patients` e retorna token.

Body:

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "senha1234",
  "phone": "11999999999",
  "birthDate": "1995-04-20",
  "document": "12345678900"
}
```

Campos obrigatórios: `name`, `email`, `password`.

Resposta `201`:

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "role": "patient",
    "active": true,
    "lastLoginAt": null,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  },
  "patient": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "phone": "11999999999",
    "birthDate": "1995-04-20T00:00:00.000Z",
    "document": "12345678900",
    "avatarUrl": null,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  },
  "token": "jwt-token"
}
```

Erros comuns:

- `400` para body inválido.
- `409` quando o e-mail já está cadastrado.

### POST /auth/login

Body:

```json
{
  "email": "maria@example.com",
  "password": "senha1234"
}
```

Resposta `200`:

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "role": "patient",
    "active": true,
    "lastLoginAt": "2026-06-11T10:10:00.000Z",
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:10:00.000Z"
  },
  "token": "jwt-token"
}
```

Erros comuns:

- `401` para credenciais inválidas.
- `401` para usuário inativo.

### GET /auth/me

Proteção: qualquer usuário autenticado.

Resposta `200`:

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "role": "patient",
    "active": true,
    "lastLoginAt": "2026-06-11T10:10:00.000Z",
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:10:00.000Z"
  }
}
```

## Patients

### GET /patients/me

Proteção: `patient`.

Retorna o perfil do paciente autenticado. O `id` retornado é `patients.id`; `name` e `email` vêm de `users`.

Resposta `200`:

```json
{
  "patient": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "phone": "11999999999",
    "birthDate": "1995-04-20T00:00:00.000Z",
    "document": "12345678900",
    "avatarUrl": null,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

Campos não retornados: `userId`, `passwordHash`, `role`, `active`, `lastLoginAt`.

### PATCH /patients/me

Proteção: `patient`.

Atualização parcial. Body vazio é inválido.

Body:

```json
{
  "name": "Maria Oliveira",
  "phone": null
}
```

Regras:

- `name` atualiza `users.name`.
- `phone` atualiza `patients.phone`.
- `phone: null` limpa o telefone.
- Quando `name` e `phone` são enviados juntos, a atualização acontece em transação.

Resposta `200`:

```json
{
  "patient": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "Maria Oliveira",
    "email": "maria@example.com",
    "phone": null,
    "birthDate": "1995-04-20T00:00:00.000Z",
    "document": "12345678900",
    "avatarUrl": null,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:20:00.000Z"
  }
}
```

## Specialties

### GET /specialties

Pública.

Retorna apenas especialidades ativas.

Resposta `200`:

```json
{
  "specialties": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174010",
      "name": "Cardiologia",
      "description": "Especialidade do coração",
      "icon": "heart",
      "active": true,
      "createdAt": "2026-06-11T10:00:00.000Z",
      "updatedAt": "2026-06-11T10:00:00.000Z"
    }
  ]
}
```

### GET /specialties/:id

Pública.

Resposta `200`:

```json
{
  "specialty": {
    "id": "123e4567-e89b-12d3-a456-426614174010",
    "name": "Cardiologia",
    "description": "Especialidade do coração",
    "icon": "heart",
    "active": true,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

Erro comum:

- `404` quando a especialidade não existe ou está inativa.

### POST /admin/specialties

Proteção: `admin` ou `super_admin`.

Body:

```json
{
  "name": "Neurologia",
  "description": "Sistema nervoso",
  "icon": "brain"
}
```

Resposta `201`:

```json
{
  "specialty": {
    "id": "123e4567-e89b-12d3-a456-426614174011",
    "name": "Neurologia",
    "description": "Sistema nervoso",
    "icon": "brain",
    "active": true,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

### PATCH /admin/specialties/:id

Proteção: `admin` ou `super_admin`.

Body parcial. Pelo menos um campo deve ser enviado:

```json
{
  "description": null
}
```

Resposta `200`: `{ "specialty": ... }`.

### DELETE /admin/specialties/:id

Proteção: `admin` ou `super_admin`.

Desativa a especialidade.

Resposta `200`: `{ "specialty": ... }`.

## Doctors

### GET /doctors

Pública.

Query params:

| Campo | Obrigatório | Padrão | Descrição |
| --- | --- | --- | --- |
| `search` | Não | - | Busca por nome. |
| `specialtyId` | Não | - | Filtra por especialidade ativa. |
| `page` | Não | `1` | Página. |
| `perPage` | Não | `20` | Itens por página, máximo `100`. |

Exemplo:

```txt
GET /doctors?search=juliana&specialtyId=123e4567-e89b-12d3-a456-426614174010&page=1&perPage=10
```

Resposta `200`:

```json
{
  "doctors": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174020",
      "name": "Dra. Juliana Martins",
      "email": "juliana@example.com",
      "crm": "123456",
      "bio": "Atendimento clínico geral.",
      "avatarUrl": null,
      "active": true,
      "specialty": {
        "id": "123e4567-e89b-12d3-a456-426614174010",
        "name": "Clínica Geral"
      },
      "clinic": {
        "id": "123e4567-e89b-12d3-a456-426614174030",
        "name": "Clínica Saúde",
        "address": "Rua A, 123"
      },
      "availableToday": true,
      "createdAt": "2026-06-11T10:00:00.000Z",
      "updatedAt": "2026-06-11T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /doctors/:id

Pública.

Resposta `200`:

```json
{
  "doctor": {
    "id": "123e4567-e89b-12d3-a456-426614174020",
    "name": "Dra. Juliana Martins",
    "email": "juliana@example.com",
    "crm": "123456",
    "bio": "Atendimento clínico geral.",
    "avatarUrl": null,
    "active": true,
    "specialty": {
      "id": "123e4567-e89b-12d3-a456-426614174010",
      "name": "Clínica Geral"
    },
    "clinic": {
      "id": "123e4567-e89b-12d3-a456-426614174030",
      "name": "Clínica Saúde",
      "address": "Rua A, 123"
    },
    "availableToday": true,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

Erro comum:

- `404` quando o médico não existe ou está inativo.

### POST /admin/doctors

Proteção: `admin` ou `super_admin`.

Body:

```json
{
  "name": "Dra. Juliana Martins",
  "email": "juliana@example.com",
  "crm": "123456",
  "bio": "Atendimento clínico geral.",
  "avatarUrl": null,
  "specialtyId": "123e4567-e89b-12d3-a456-426614174010",
  "clinicId": "123e4567-e89b-12d3-a456-426614174030"
}
```

Resposta `201`: `{ "doctor": ... }`.

Observação: o módulo administrativo cria o usuário do médico com senha temporária interna (`dummy-hash`). O fluxo definitivo de ativação/senha do médico não faz parte do MVP atual.

### PATCH /admin/doctors/:id

Proteção: `admin` ou `super_admin`.

Body parcial. Pelo menos um campo deve ser enviado:

```json
{
  "bio": null,
  "clinicId": "123e4567-e89b-12d3-a456-426614174031"
}
```

Resposta `200`: `{ "doctor": ... }`.

### DELETE /admin/doctors/:id

Proteção: `admin` ou `super_admin`.

Desativa o médico.

Resposta `200`: `{ "doctor": ... }`.

## Availability

### GET /doctors/:doctorId/available-slots

Pública.

Query params:

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `date` | Sim | Data em `YYYY-MM-DD`. |
| `clinicId` | Sim | Clínica onde o médico atende. |

Exemplo:

```txt
GET /doctors/123e4567-e89b-12d3-a456-426614174020/available-slots?date=2026-06-15&clinicId=123e4567-e89b-12d3-a456-426614174030
```

Resposta `200`:

```json
{
  "doctorId": "123e4567-e89b-12d3-a456-426614174020",
  "clinicId": "123e4567-e89b-12d3-a456-426614174030",
  "date": "2026-06-15",
  "slots": [
    {
      "time": "08:00",
      "available": true
    },
    {
      "time": "08:30",
      "available": true
    }
  ]
}
```

Regras:

- Retorna `slots: []` quando não há regra ativa para a data.
- Remove horários ocupados por consultas `scheduled` e `confirmed`.
- Consultas `canceled`, `completed` e `no_show` não ocupam slot.
- Médico, clínica e relação médico-clínica devem estar ativos.

### POST /admin/doctors/:doctorId/availability

Proteção: `admin` ou `super_admin`.

Body:

```json
{
  "clinicId": "123e4567-e89b-12d3-a456-426614174030",
  "weekday": 1,
  "startTime": "08:00",
  "endTime": "12:00",
  "slotDurationInMinutes": 30
}
```

`weekday`: `0` domingo, `1` segunda, ..., `6` sábado.

Resposta `201`:

```json
{
  "availability": {
    "id": "123e4567-e89b-12d3-a456-426614174040",
    "doctorId": "123e4567-e89b-12d3-a456-426614174020",
    "clinicId": "123e4567-e89b-12d3-a456-426614174030",
    "weekday": 1,
    "startTime": "08:00",
    "endTime": "12:00",
    "slotDurationInMinutes": 30,
    "active": true,
    "createdAt": "2026-06-11T10:00:00.000Z",
    "updatedAt": "2026-06-11T10:00:00.000Z"
  }
}
```

### GET /admin/doctors/:doctorId/availability

Proteção: `admin` ou `super_admin`.

Resposta `200`:

```json
{
  "availability": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174040",
      "doctorId": "123e4567-e89b-12d3-a456-426614174020",
      "clinicId": "123e4567-e89b-12d3-a456-426614174030",
      "weekday": 1,
      "startTime": "08:00",
      "endTime": "12:00",
      "slotDurationInMinutes": 30,
      "active": true,
      "createdAt": "2026-06-11T10:00:00.000Z",
      "updatedAt": "2026-06-11T10:00:00.000Z"
    }
  ]
}
```

### PATCH /admin/availability/:id

Proteção: `admin` ou `super_admin`.

Body parcial. Pelo menos um campo deve ser enviado:

```json
{
  "startTime": "09:00",
  "endTime": "13:00"
}
```

Resposta `200`: `{ "availability": ... }`.

### DELETE /admin/availability/:id

Proteção: `admin` ou `super_admin`.

Desativa a regra de disponibilidade.

Resposta `200`: `{ "availability": ... }`.

## Appointments

### POST /appointments

Proteção: `patient`.

Cria uma consulta para o paciente autenticado.

Body:

```json
{
  "doctorId": "123e4567-e89b-12d3-a456-426614174020",
  "specialtyId": "123e4567-e89b-12d3-a456-426614174010",
  "clinicId": "123e4567-e89b-12d3-a456-426614174030",
  "date": "2026-06-15",
  "startTime": "10:30"
}
```

Resposta `201`:

```json
{
  "appointment": {
    "id": "123e4567-e89b-12d3-a456-426614174050",
    "doctor": {
      "id": "123e4567-e89b-12d3-a456-426614174020",
      "name": "Dra. Juliana Martins"
    },
    "specialty": {
      "id": "123e4567-e89b-12d3-a456-426614174010",
      "name": "Clínica Geral"
    },
    "clinic": {
      "id": "123e4567-e89b-12d3-a456-426614174030",
      "name": "Clínica Saúde"
    },
    "date": "2026-06-15",
    "startTime": "10:30",
    "endTime": "11:00",
    "status": "scheduled"
  }
}
```

Regras:

- Não envie `patientId`; o paciente vem do JWT.
- Status inicial é `scheduled`.
- Data passada retorna `400`.
- Horário fora da disponibilidade retorna `400`.
- Médico, clínica, especialidade e relações precisam estar ativos.
- Conflito de horário retorna `409`.

### GET /appointments/:id

Proteção: `patient`.

Retorna apenas consulta pertencente ao paciente autenticado.

Resposta `200`: `{ "appointment": ... }`.

Erro comum:

- `404` quando a consulta não existe ou pertence a outro paciente.

### GET /appointments/upcoming

Proteção: `patient`.

Lista próximas consultas do paciente autenticado, em ordem cronológica.

Inclui status: `scheduled`, `confirmed`.

Resposta `200`:

```json
{
  "appointments": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174050",
      "doctorName": "Dra. Juliana Martins",
      "specialtyName": "Clínica Geral",
      "clinicName": "Clínica Saúde",
      "date": "2026-06-15",
      "startTime": "10:30",
      "status": "scheduled"
    }
  ]
}
```

### GET /appointments/history

Proteção: `patient`.

Lista histórico do paciente autenticado, do mais recente para o mais antigo.

Inclui status: `completed`, `canceled`, `no_show`.

Resposta `200`:

```json
{
  "appointments": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174050",
      "doctorName": "Dra. Juliana Martins",
      "specialtyName": "Clínica Geral",
      "clinicName": "Clínica Saúde",
      "date": "2026-06-15",
      "startTime": "10:30",
      "status": "canceled"
    }
  ]
}
```

### PATCH /appointments/:id/cancel

Proteção: `patient`.

Cancela uma consulta futura do paciente autenticado.

Body:

```json
{
  "reason": "Não poderei comparecer"
}
```

Resposta `200`:

```json
{
  "appointment": {
    "id": "123e4567-e89b-12d3-a456-426614174050",
    "status": "canceled",
    "cancelReason": "Não poderei comparecer"
  }
}
```

Regras:

- Consulta precisa pertencer ao paciente autenticado.
- Consulta precisa ser futura por data + horário em `America/Sao_Paulo`.
- `completed` e `no_show` não podem ser canceladas.
- Consulta já `canceled` retorna `409`.
- Cancelamento salva `cancelReason` e `canceledByUserId`.
- Consulta cancelada libera o slot e aparece em `/appointments/history`.

## Health

### GET /health

Pública.

Resposta `200`:

```json
{
  "status": "ok"
}
```

## Erros

### Formato De Erro De Domínio

```json
{
  "statusCode": 404,
  "error": "AppError",
  "message": "Doctor not found"
}
```

### Formato De Erro De Validação

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
  "issues": [
    {
      "code": "invalid_format",
      "path": ["email"],
      "message": "Invalid email address"
    }
  ]
}
```

### Status HTTP Comuns

| Status | Quando ocorre |
| --- | --- |
| `400` | Entrada inválida, body vazio em PATCH parcial, data passada, horário fora da disponibilidade ou regra de disponibilidade inválida. |
| `401` | Token ausente, token inválido, credenciais inválidas, usuário inativo ou paciente autenticado inexistente. |
| `403` | Usuário autenticado sem perfil permitido para a rota. |
| `404` | Recurso não encontrado, inativo ou não pertence ao paciente autenticado. |
| `409` | Conflito de e-mail, CRM, horário ocupado, consulta já cancelada ou nome de especialidade duplicado. |
| `500` | Erro não tratado. |

### Mensagens Frequentes

| Mensagem | Status |
| --- | --- |
| `Missing authorization token` | `401` |
| `Invalid authorization token` | `401` |
| `Invalid token` | `401` |
| `Forbidden` | `403` |
| `E-mail already registered` | `409` |
| `Patient profile not found` | `404` |
| `Doctor not found` | `404` |
| `Specialty not found` | `404` |
| `Clinic not found` | `404` |
| `Doctor clinic relation not found` | `404` |
| `Doctor specialty relation not found` | `404` |
| `Appointment time is already occupied` | `409` |
| `Patient already has an appointment at this time` | `409` |
| `Appointment date cannot be in the past` | `400` |
| `Appointment time is outside doctor availability` | `400` |
| `Appointment not found` | `404` |
| `Appointment cannot be canceled` | `400` |
| `Appointment is already canceled` | `409` |
| `Only future appointments can be canceled` | `400` |

## Fluxo Mobile Sugerido

1. `POST /auth/register` ou `POST /auth/login`.
2. Salvar `token`.
3. Carregar `GET /patients/me`.
4. Carregar `GET /specialties`.
5. Carregar `GET /doctors`, opcionalmente com `specialtyId` ou `search`.
6. Carregar `GET /doctors/:doctorId/available-slots?date=YYYY-MM-DD&clinicId=<clinicId>`.
7. Criar consulta com `POST /appointments`.
8. Listar próximas consultas com `GET /appointments/upcoming`.
9. Listar histórico com `GET /appointments/history`.
10. Cancelar consulta futura com `PATCH /appointments/:id/cancel`.
