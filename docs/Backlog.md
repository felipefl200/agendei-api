# Backlog MVP — API Agendei

## Objetivo

Este backlog organiza as tarefas necessárias para entregar o MVP da API do Agendei.

A API deve permitir:

- Cadastro e login de pacientes, médicos e administradores.
- Autenticação com JWT.
- Listagem de especialidades.
- Listagem de médicos.
- Consulta de horários disponíveis.
- Criação de agendamentos.
- Validação de conflitos.
- Listagem de próximas consultas.
- Histórico de consultas.
- Cancelamento de consultas.
- Integração com o aplicativo mobile.

---

# Epic 1 — Setup inicial do projeto

## 1. Configurar projeto Node + TypeScript

### Descrição

Criar a base inicial da API com Node.js e TypeScript.

### Tarefas

- Criar projeto Node.
- Configurar TypeScript.
- Configurar `tsx` para execução em desenvolvimento.
- Criar estrutura inicial de pastas.
- Criar `src/server.ts`.
- Criar `src/app.ts`.
- Criar rota inicial de health check.

### Critérios de aceite

- O projeto deve iniciar com `npm run dev`.
- A rota `GET /health` deve retornar status `ok`.
- O TypeScript deve compilar sem erros.

### Sugestão de scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

---

## 2. Configurar ESLint + Prettier

### Descrição

Padronizar qualidade e formatação do código.

### Tarefas

- Instalar ESLint.
- Instalar Prettier.
- Configurar sem ponto e vírgula.
- Configurar aspas simples.
- Criar `.prettierrc`.
- Criar `eslint.config.js`.
- Criar `.eslintignore` se necessário.
- Adicionar scripts de lint e format.

### Critérios de aceite

- `npm run lint` deve executar sem erro.
- `npm run format` deve formatar o projeto.
- O padrão deve usar aspas simples.
- O padrão deve evitar ponto e vírgula no final.

### Sugestão de scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

---

## 3. Configurar Docker com MySQL

### Descrição

Criar ambiente local de banco de dados usando Docker.

### Tarefas

- Criar `docker-compose.yml`.
- Configurar serviço MySQL.
- Configurar usuário, senha e banco.
- Configurar volume persistente.
- Configurar porta local.
- Criar `.env.example`.

### Critérios de aceite

- `docker compose up -d` deve subir o MySQL.
- O banco deve aceitar conexão local.
- O Prisma deve conseguir conectar usando `DATABASE_URL`.

### Exemplo de serviço

```yaml
services:
  mysql:
    image: mysql:8.4
    container_name: agendei-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: agendei
      MYSQL_USER: agendei
      MYSQL_PASSWORD: agendei
    ports:
      - '3306:3306'
    volumes:
      - agendei_mysql_data:/var/lib/mysql

volumes:
  agendei_mysql_data:
```

---

# Epic 2 — Banco de dados e Prisma

## 4. Configurar Prisma

### Descrição

Adicionar Prisma ORM ao projeto.

### Tarefas

- Instalar Prisma e Prisma Client.
- Executar `npx prisma init`.
- Configurar provider MySQL.
- Configurar `DATABASE_URL`.
- Criar client Prisma compartilhado.
- Criar script para Prisma Studio.

### Critérios de aceite

- `npx prisma validate` deve executar sem erros.
- `npx prisma studio` deve abrir corretamente.
- A conexão com MySQL deve funcionar.

### Provider esperado

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

---

## 5. Criar schema inicial

### Descrição

Criar o primeiro modelo de dados da API.

### Tabelas iniciais

- users
- patients
- doctors
- admins
- specialties
- clinics
- doctor_availabilities
- appointments
- notifications

### Decisão importante

A autenticação deve ser centralizada em `users`, com perfis separados.

### Modelo conceitual

```txt
User 1:1 Patient
User 1:1 Doctor
User 1:1 Admin

Doctor N:1 Specialty
Doctor N:1 Clinic
Doctor 1:N DoctorAvailability
Doctor 1:N Appointment

Patient 1:N Appointment
Patient 1:N Notification
```

### Critérios de aceite

- Schema deve validar.
- Relacionamentos principais devem estar definidos.
- Enums de `Role` e `AppointmentStatus` devem existir.
- Campos `createdAt` e `updatedAt` devem existir nas tabelas principais.

---

## 6. Criar migrations

### Descrição

Gerar e aplicar a migration inicial do banco.

### Tarefas

- Criar migration inicial.
- Aplicar migration no MySQL local.
- Validar tabelas criadas.
- Versionar migration no repositório.

### Critérios de aceite

- `npx prisma migrate dev` deve executar com sucesso.
- As tabelas devem aparecer no banco.
- O Prisma Client deve ser gerado.

---

## 7. Criar seed de especialidades

### Descrição

Popular o banco com especialidades médicas iniciais.

### Especialidades iniciais

- Clínica Geral
- Cardiologia
- Pediatria
- Ginecologia
- Dermatologia
- Ortopedia

### Tarefas

- Criar arquivo de seed.
- Configurar script `db:seed`.
- Garantir que seed possa rodar mais de uma vez sem duplicar dados.

### Critérios de aceite

- `npm run db:seed` deve criar especialidades.
- Rodar seed novamente não deve duplicar registros.
- Especialidades devem estar ativas.

---

# Epic 3 — Autenticação e usuários

## 8. Criar módulo de auth

### Descrição

Implementar autenticação básica com JWT para paciente, médico e admin.

### Rotas

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

### Tarefas

- Criar módulo `auth`.
- Criar schemas com Zod v4.
- Criar cadastro de paciente.
- Criar login com e-mail e senha.
- Gerar JWT.
- Criar middleware `authenticate`.
- Criar middleware `authorize`.
- Criar retorno seguro sem `passwordHash`.

### Critérios de aceite

- Paciente deve conseguir criar conta.
- Usuário deve conseguir fazer login.
- Login inválido deve retornar 401.
- Token válido deve acessar `/auth/me`.
- Token inválido deve retornar 401.
- Senha nunca deve ser retornada pela API.
- JWT deve conter `sub` e `role`.

---

## 9. Criar módulo de patients

### Descrição

Permitir consulta e atualização do perfil do paciente autenticado.

### Rotas

```txt
GET /patients/me
PATCH /patients/me
```

### Tarefas

- Criar módulo `patients`.
- Criar busca por usuário autenticado.
- Criar atualização de nome e telefone.
- Validar dados com Zod.
- Proteger rotas com perfil `patient`.

### Critérios de aceite

- Paciente deve ver o próprio perfil.
- Paciente deve atualizar nome.
- Paciente deve atualizar telefone.
- Paciente não deve acessar dados de outro paciente.

---

# Epic 4 — Catálogo médico

## 10. Criar módulo de specialties

### Descrição

Permitir listagem pública de especialidades e gestão administrativa.

### Rotas públicas

```txt
GET /specialties
GET /specialties/:id
```

### Rotas admin

```txt
POST /admin/specialties
PATCH /admin/specialties/:id
DELETE /admin/specialties/:id
```

### Tarefas

- Criar módulo `specialties`.
- Criar listagem de especialidades ativas.
- Criar detalhe da especialidade.
- Criar CRUD administrativo.
- Validar entrada com Zod.
- Proteger rotas admin.

### Critérios de aceite

- App mobile deve listar especialidades.
- Especialidades inativas não devem aparecer na listagem pública.
- Apenas admin pode criar, editar ou desativar especialidades.

---

## 11. Criar módulo de doctors

### Descrição

Permitir listagem e detalhe de médicos.

### Rotas públicas

```txt
GET /doctors
GET /doctors/:id
```

### Query params

```txt
search
specialtyId
page
perPage
```

### Rotas admin

```txt
POST /admin/doctors
PATCH /admin/doctors/:id
DELETE /admin/doctors/:id
```

### Tarefas

- Criar módulo `doctors`.
- Criar listagem paginada.
- Criar filtro por especialidade.
- Criar busca por nome.
- Criar detalhe do médico.
- Criar CRUD administrativo.
- Relacionar médico com especialidade e clínica.
- Proteger rotas admin.

### Critérios de aceite

- App mobile deve listar médicos ativos.
- Deve ser possível filtrar por especialidade.
- Deve ser possível buscar médico por nome.
- Médico inativo não deve aparecer na listagem pública.
- Apenas admin pode criar, editar ou desativar médico.

---

# Epic 5 — Disponibilidade

## 12. Criar módulo de availability

### Descrição

Gerenciar disponibilidade semanal dos médicos e calcular horários disponíveis.

### Rotas públicas

```txt
GET /doctors/:doctorId/available-slots?date=YYYY-MM-DD
```

### Rotas admin

```txt
POST /admin/doctors/:doctorId/availability
GET /admin/doctors/:doctorId/availability
PATCH /admin/availability/:id
DELETE /admin/availability/:id
```

### Tarefas

- Criar módulo `availability`.
- Criar regras semanais de atendimento.
- Criar cálculo de slots por data.
- Excluir slots já ocupados.
- Considerar duração da consulta.
- Proteger gestão de disponibilidade com admin.

### Critérios de aceite

- API deve retornar horários disponíveis por médico e data.
- Horários ocupados não devem aparecer como disponíveis.
- Data sem disponibilidade deve retornar lista vazia.
- Médico inativo não deve retornar horários.
- Horários cancelados devem voltar a ficar disponíveis.

---

# Epic 6 — Agendamentos

## 13. Criar módulo de appointments

### Descrição

Permitir criação e consulta de agendamentos.

### Rotas

```txt
POST /appointments
GET /appointments/:id
```

### Tarefas

- Criar módulo `appointments`.
- Criar criação de consulta.
- Relacionar paciente autenticado.
- Relacionar médico, especialidade e clínica.
- Definir status inicial.
- Retornar dados formatados para o mobile.

### Critérios de aceite

- Paciente autenticado deve criar consulta.
- Consulta criada deve iniciar como `scheduled`.
- Consulta deve retornar médico, especialidade, clínica, data, horário e status.
- Paciente não pode criar consulta para outro paciente.

---

## 14. Criar regra de conflito de agendamento

### Descrição

Impedir agendamentos duplicados ou inválidos.

### Regras

A API deve impedir:

- Dois pacientes no mesmo médico, data e horário.
- Um paciente com duas consultas no mesmo horário.
- Consulta em data passada.
- Consulta fora da disponibilidade do médico.
- Consulta com médico inativo.
- Consulta com especialidade inativa.

### Status que bloqueiam horário

```txt
scheduled
confirmed
```

### Status que liberam horário

```txt
canceled
completed
no_show
```

### Tarefas

- Criar validação de disponibilidade.
- Criar validação de conflito por médico.
- Criar validação de conflito por paciente.
- Executar criação dentro de transação.
- Retornar erro 409 para conflito.

### Critérios de aceite

- Não deve permitir horário duplicado para o mesmo médico.
- Não deve permitir paciente com duas consultas no mesmo horário.
- Deve retornar 409 quando o horário estiver ocupado.
- Deve retornar 400 para data passada.
- Deve retornar 400 para horário fora da disponibilidade.

---

## 15. Criar upcoming/history

### Descrição

Permitir que o app mobile liste próximas consultas e histórico.

### Rotas

```txt
GET /appointments/upcoming
GET /appointments/history
```

### Regras

Próximas consultas:

```txt
scheduled
confirmed
```

Histórico:

```txt
completed
canceled
no_show
```

### Tarefas

- Criar listagem de próximas consultas.
- Criar listagem de histórico.
- Ordenar próximas por data crescente.
- Ordenar histórico por data decrescente.
- Retornar dados compactos para o app.

### Critérios de aceite

- Paciente deve ver apenas as próprias consultas.
- Próximas consultas devem vir em ordem cronológica.
- Histórico deve vir do mais recente para o mais antigo.
- Consultas canceladas devem aparecer no histórico.

---

## 16. Criar cancelamento

### Descrição

Permitir cancelamento de consulta futura pelo paciente.

### Rota

```txt
PATCH /appointments/:id/cancel
```

### Body

```json
{
  "reason": "Não poderei comparecer"
}
```

### Tarefas

- Criar endpoint de cancelamento.
- Validar se consulta pertence ao paciente.
- Validar se consulta é futura.
- Validar se consulta ainda pode ser cancelada.
- Salvar motivo do cancelamento.
- Atualizar status para `canceled`.

### Critérios de aceite

- Paciente pode cancelar consulta futura.
- Paciente não pode cancelar consulta de outro paciente.
- Paciente não pode cancelar consulta concluída.
- Consulta cancelada deve liberar horário.
- Consulta cancelada deve aparecer no histórico.

---

# Epic 7 — Documentação e integração

## 17. Criar documentação

### Descrição

Documentar a API para facilitar integração com o app mobile.

### Tarefas

- Criar README da API.
- Criar documentação de variáveis de ambiente.
- Criar documentação dos endpoints.
- Criar exemplos de request/response.
- Criar documentação de erros.
- Criar instruções para rodar Docker.
- Criar instruções para migrations e seed.

### Critérios de aceite

- Um desenvolvedor deve conseguir rodar a API localmente seguindo o README.
- O mobile deve conseguir consultar os contratos das rotas.
- A documentação deve conter exemplos de autenticação.

---

## 18. Integrar mobile

### Descrição

Conectar o aplicativo mobile à API.

### Tarefas

- Configurar base URL no app.
- Criar client HTTP.
- Integrar login.
- Integrar cadastro.
- Integrar listagem de especialidades.
- Integrar listagem de médicos.
- Integrar horários disponíveis.
- Integrar criação de consulta.
- Integrar próximas consultas.
- Integrar histórico.
- Integrar cancelamento.
- Tratar loading, erro e empty states.

### Critérios de aceite

- App deve autenticar com API real.
- App deve persistir token.
- App deve carregar especialidades reais.
- App deve carregar médicos reais.
- App deve criar agendamento real.
- App deve listar próximas consultas.
- App deve listar histórico.
- App deve cancelar consulta.
- Erros da API devem aparecer de forma amigável.
