# Backlog Task — Modelagem inicial do banco de dados, autenticação e controle de permissões

## Identificação

**Título:** Criar modelagem inicial do banco de dados com autenticação, perfis, clínicas, médicos, pacientes, permissões e consultas

**Tipo:** Backend / Database / Architecture

**Prioridade:** Alta

**Status:** A fazer

**Módulo:** Database / Auth / Access Control / Appointments

**Dependências anteriores:**

- Projeto Node.js + TypeScript configurado.
- Fastify configurado.
- Drizzle ORM configurado.
- Docker com MySQL configurado.
- Arquivo `.env` com `DATABASE_URL` configurado (usando modo nativo do `node --env-file=.env`, sem o pacote externo `dotenv`).

---

## 1. Objetivo

Criar a estrutura inicial do banco de dados da API Agendei usando **Drizzle ORM + MySQL**, contemplando autenticação centralizada, perfis de usuário, clínicas, médicos, pacientes, administradores, permissões, especialidades, disponibilidade médica, consultas e notificações.

A modelagem deve permitir que:

- Pacientes possam criar conta e agendar consultas.
- Médicos possam acessar sua própria agenda.
- Administradores de clínica possam gerenciar médicos, agendas e consultas de suas clínicas.
- Super administradores possam gerenciar clínicas, administradores e dados globais da plataforma.
- A API consiga validar permissões de acesso com base em `role` e vínculos com clínicas.
- O banco tenha estrutura suficiente para impedir inconsistências de domínio, principalmente em relação a agendamentos.

---

## 2. Contexto da decisão

O Agendei terá autenticação, pacientes, clínicas, médicos e administradores no mesmo banco de dados.

Como existe a necessidade de controlar quem pode cadastrar clínicas, médicos e agendas, o sistema precisa possuir controle de acesso baseado em papéis.

A decisão definida é usar uma tabela central de autenticação chamada `users`, com perfis separados para `patients`, `doctors` e vínculos administrativos.

Roles iniciais:

```txt
patient
doctor
admin
super_admin
```

Responsabilidade de cada role:

```txt
patient     → agenda e acompanha as próprias consultas
doctor      → visualiza sua própria agenda e consultas vinculadas
admin       → gerencia uma ou mais clínicas vinculadas
super_admin → gerencia a plataforma, clínicas e admins
```

---

## 3. Regras de negócio principais

## 3.1 Criação de clínicas

Somente usuários com role `super_admin` podem criar clínicas.

Fluxo esperado:

```txt
1. super_admin cria uma clínica
2. super_admin cria ou vincula um admin para essa clínica
3. admin da clínica cadastra médicos
4. admin da clínica cadastra disponibilidade dos médicos
5. paciente agenda consulta com médico disponível
```

Um `admin` não deve criar clínicas novas. Ele apenas gerencia clínicas às quais está vinculado.

---

## 3.2 Gestão de médicos

Médicos devem ser vinculados a uma ou mais clínicas.

Um médico pode atender em mais de uma clínica.

Exemplo:

```txt
Dra. Juliana atende na Clínica Saúde & Vida
Dra. Juliana também atende na Clínica Centro Médico
```

Por isso, o relacionamento entre médicos e clínicas deve ser feito por tabela intermediária.

---

## 3.3 Gestão de especialidades

Especialidades devem ser globais da plataforma.

Apenas `super_admin` deve criar, editar ou desativar especialidades.

Um médico pode possuir uma ou mais especialidades.

Exemplo:

```txt
Dr. Rafael Souza → Cardiologia
Dra. Camila Lemos → Pediatria
Dra. Beatriz Nunes → Ginecologia
```

---

## 3.4 Disponibilidade médica

A disponibilidade deve estar vinculada a:

```txt
médico
clínica
dia da semana
horário inicial
horário final
duração do slot
```

Isso é necessário porque o mesmo médico pode ter horários diferentes em clínicas diferentes.

Exemplo:

```txt
Dra. Juliana
Clínica Saúde & Vida
Segunda-feira
08:00 até 12:00
slots de 30 minutos
```

---

## 3.5 Agendamento

Uma consulta deve estar vinculada a:

```txt
paciente
médico
clínica
especialidade
data
horário inicial
horário final
status
```

A API deve impedir:

- Duas consultas ativas para o mesmo médico no mesmo horário.
- Um paciente com duas consultas no mesmo horário.
- Consulta em data passada.
- Consulta fora da disponibilidade do médico.
- Consulta com médico inativo.
- Consulta com clínica inativa.
- Consulta com especialidade inativa.
- Consulta criada por usuário sem role `patient`.

Status que bloqueiam horário:

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

---

## 4. Tabelas a serem criadas

## 4.1 `users`

Tabela central de autenticação.

### Responsabilidade

Guardar dados comuns de autenticação e autorização.

### Campos

```txt
id
name
email
password_hash
role
active
last_login_at
created_at
updated_at
```

### Regras

- `email` deve ser único.
- `password_hash` deve ser obrigatório.
- `role` deve aceitar apenas valores definidos no enum `UserRole`.
- `active` deve indicar se o usuário pode ou não acessar o sistema.
- A senha nunca deve ser retornada pela API.

### Enum esperado

```txt
UserRole:
- patient
- doctor
- admin
- super_admin
```

---

## 4.2 `patients`

Tabela com dados específicos do paciente.

### Responsabilidade

Guardar informações do paciente que utiliza o app mobile.

### Campos

```txt
id
user_id
phone
birth_date
document
avatar_url
created_at
updated_at
```

### Relacionamentos

```txt
patients.user_id → users.id
```

### Regras

- Todo paciente deve ter um usuário.
- `user_id` deve ser único.
- O usuário relacionado deve possuir role `patient`.
- Paciente só pode acessar e alterar seus próprios dados.

---

## 4.3 `clinics`

Tabela de clínicas.

### Responsabilidade

Guardar dados das clínicas disponíveis na plataforma.

### Campos

```txt
id
name
corporate_name
document
phone
email
address
city
state
zip_code
active
created_by_user_id
created_at
updated_at
```

### Relacionamentos

```txt
clinics.created_by_user_id → users.id
```

### Regras

- Somente `super_admin` pode criar clínicas.
- Clínica pode ser desativada, mas não deve ser removida fisicamente.
- Clínicas inativas não devem aparecer em listagens públicas.
- Clínicas inativas não devem permitir novos agendamentos.
- `created_by_user_id` deve registrar quem criou a clínica.

---

## 4.4 `clinic_admins`

Tabela intermediária entre usuários administradores e clínicas.

### Responsabilidade

Definir quais administradores gerenciam quais clínicas.

### Campos

```txt
id
clinic_id
user_id
active
created_at
updated_at
```

### Relacionamentos

```txt
clinic_admins.clinic_id → clinics.id
clinic_admins.user_id → users.id
```

### Regras

- Um admin pode gerenciar uma ou mais clínicas.
- Uma clínica pode ter um ou mais admins.
- O usuário relacionado deve possuir role `admin`.
- Admin só pode acessar dados das clínicas às quais está vinculado.
- Registro inativo deve remover acesso administrativo à clínica.
- Deve existir restrição única para evitar duplicidade entre `clinic_id` e `user_id`.

---

## 4.5 `doctors`

Tabela com dados específicos do médico.

### Responsabilidade

Guardar informações profissionais do médico.

### Campos

```txt
id
user_id
crm
bio
avatar_url
active
created_at
updated_at
```

### Relacionamentos

```txt
doctors.user_id → users.id
```

### Regras

- Todo médico deve ter um usuário.
- `user_id` deve ser único.
- `crm` deve ser único.
- O usuário relacionado deve possuir role `doctor`.
- Médico inativo não deve aparecer na listagem pública.
- Médico inativo não deve receber novos agendamentos.

---

## 4.6 `doctor_clinics`

Tabela intermediária entre médicos e clínicas.

### Responsabilidade

Vincular médicos às clínicas onde atendem.

### Campos

```txt
id
doctor_id
clinic_id
active
created_at
updated_at
```

### Relacionamentos

```txt
doctor_clinics.doctor_id → doctors.id
doctor_clinics.clinic_id → clinics.id
```

### Regras

- Um médico pode atender em uma ou mais clínicas.
- Uma clínica pode possuir vários médicos.
- Deve existir restrição única entre `doctor_id` e `clinic_id`.
- Admin só pode vincular médicos às clínicas que gerencia.
- Médico não vinculado a uma clínica não pode receber agenda naquela clínica.
- Vínculo inativo não deve permitir novos agendamentos.

---

## 4.7 `specialties`

Tabela de especialidades médicas.

### Responsabilidade

Guardar especialidades disponíveis na plataforma.

### Campos

```txt
id
name
description
icon
active
created_at
updated_at
```

### Regras

- `name` deve ser único.
- Apenas `super_admin` pode criar, editar ou desativar especialidades.
- Especialidades inativas não aparecem em listagens públicas.
- Especialidades inativas não podem ser usadas em novos agendamentos.

### Seed inicial obrigatória

```txt
Clínica Geral
Cardiologia
Pediatria
Ginecologia
Dermatologia
Ortopedia
```

---

## 4.8 `doctor_specialties`

Tabela intermediária entre médicos e especialidades.

### Responsabilidade

Permitir que um médico tenha uma ou mais especialidades.

### Campos

```txt
id
doctor_id
specialty_id
created_at
updated_at
```

### Relacionamentos

```txt
doctor_specialties.doctor_id → doctors.id
doctor_specialties.specialty_id → specialties.id
```

### Regras

- Um médico pode possuir uma ou mais especialidades.
- Uma especialidade pode pertencer a vários médicos.
- Deve existir restrição única entre `doctor_id` e `specialty_id`.
- Admin só pode definir especialidades de médicos vinculados às clínicas que gerencia.
- Não deve ser possível vincular especialidade inativa a médico.

---

## 4.9 `doctor_availabilities`

Tabela de disponibilidade semanal do médico.

### Responsabilidade

Guardar regras de atendimento semanal por médico e clínica.

### Campos

```txt
id
doctor_id
clinic_id
weekday
start_time
end_time
slot_duration_minutes
active
created_at
updated_at
```

### Relacionamentos

```txt
doctor_availabilities.doctor_id → doctors.id
doctor_availabilities.clinic_id → clinics.id
```

### Regras

- `weekday` deve aceitar valores de 0 a 6.
- `start_time` deve ser menor que `end_time`.
- `slot_duration_minutes` deve ser maior que zero.
- Médico precisa estar vinculado à clínica em `doctor_clinics`.
- Admin só pode criar disponibilidade para médicos de clínicas que gerencia.
- Disponibilidade inativa não deve gerar horários disponíveis.
- Médico inativo não deve gerar horários disponíveis.
- Clínica inativa não deve gerar horários disponíveis.

### Mapeamento de weekday

```txt
0 = domingo
1 = segunda-feira
2 = terça-feira
3 = quarta-feira
4 = quinta-feira
5 = sexta-feira
6 = sábado
```

---

## 4.10 `appointments`

Tabela de consultas.

### Responsabilidade

Guardar os agendamentos de consultas médicas.

### Campos

```txt
id
patient_id
doctor_id
clinic_id
specialty_id
date
start_time
end_time
status
cancel_reason
created_by_user_id
canceled_by_user_id
created_at
updated_at
```

### Relacionamentos

```txt
appointments.patient_id → patients.id
appointments.doctor_id → doctors.id
appointments.clinic_id → clinics.id
appointments.specialty_id → specialties.id
appointments.created_by_user_id → users.id
appointments.canceled_by_user_id → users.id
```

### Enum esperado

```txt
AppointmentStatus:
- scheduled
- confirmed
- completed
- canceled
- no_show
```

### Regras

- Consulta deve pertencer a um paciente.
- Consulta deve pertencer a um médico.
- Consulta deve pertencer a uma clínica.
- Consulta deve pertencer a uma especialidade.
- `created_by_user_id` deve registrar quem criou a consulta.
- `canceled_by_user_id` deve registrar quem cancelou a consulta.
- `cancel_reason` só deve ser obrigatório quando status for `canceled`.
- Paciente só pode ver as próprias consultas.
- Médico só pode ver consultas vinculadas a ele.
- Admin só pode ver consultas das clínicas que gerencia.
- Super admin pode ver todas as consultas.
- Consulta com status `scheduled` ou `confirmed` bloqueia o horário.
- Consulta com status `canceled`, `completed` ou `no_show` libera o horário.
- Não deve ser possível criar consulta em data passada.
- Não deve ser possível criar consulta fora da disponibilidade médica.
- Não deve ser possível criar consulta com médico, clínica ou especialidade inativa.

---

## 4.11 `notifications`

Tabela de notificações.

### Responsabilidade

Guardar notificações de usuários.

### Campos

```txt
id
user_id
title
message
read
created_at
updated_at
```

### Relacionamentos

```txt
notifications.user_id → users.id
```

### Regras

- Usuário só pode ler as próprias notificações.
- Notificação deve iniciar com `read = false`.
- Notificações podem ser usadas para eventos como:

  - Consulta criada.
  - Consulta confirmada.
  - Consulta cancelada.
  - Lembrete de consulta.

---

## 5. Estrutura esperada no Drizzle

O schema do Drizzle deve conter, no mínimo, as tabelas e enums correspondentes em `mysqlCore`:

```txt
enum userRole
enum appointmentStatus

table users
table patients
table clinics
table clinicAdmins
table doctors
table doctorClinics
table specialties
table doctorSpecialties
table doctorAvailabilities
table appointments
table notifications
```

---

## 6. Permissões esperadas

## 6.1 Matriz de permissões

| Ação                            | patient |                  doctor |                                 admin | super_admin |
| ------------------------------- | ------: | ----------------------: | ------------------------------------: | ----------: |
| Criar conta de paciente         |     Sim |                     Não |                                   Não |         Sim |
| Fazer login                     |     Sim |                     Sim |                                   Sim |         Sim |
| Ver próprio perfil              |     Sim |                     Sim |                                   Sim |         Sim |
| Editar próprio perfil           |     Sim |                     Sim |                                   Sim |         Sim |
| Criar clínica                   |     Não |                     Não |                                   Não |         Sim |
| Editar qualquer clínica         |     Não |                     Não |                                   Não |         Sim |
| Editar clínica vinculada        |     Não |                     Não |                                   Sim |         Sim |
| Desativar clínica               |     Não |                     Não |                                   Não |         Sim |
| Criar admin de clínica          |     Não |                     Não |                                   Não |         Sim |
| Vincular admin à clínica        |     Não |                     Não |                                   Não |         Sim |
| Criar médico                    |     Não |                     Não |               Sim, da própria clínica |         Sim |
| Editar médico                   |     Não | Próprio perfil limitado |               Sim, da própria clínica |         Sim |
| Desativar médico                |     Não |                     Não |               Sim, da própria clínica |         Sim |
| Criar especialidade             |     Não |                     Não |                                   Não |         Sim |
| Editar especialidade            |     Não |                     Não |                                   Não |         Sim |
| Vincular médico à especialidade |     Não |                     Não |               Sim, da própria clínica |         Sim |
| Criar disponibilidade médica    |     Não |                     Não |               Sim, da própria clínica |         Sim |
| Ver horários disponíveis        |     Sim |                     Sim |                                   Sim |         Sim |
| Criar consulta                  |     Sim |                     Não | Sim, se fluxo administrativo permitir |         Sim |
| Ver próprias consultas          |     Sim |        Sim, como médico |               Sim, da própria clínica |         Sim |
| Cancelar própria consulta       |     Sim |                     Não |               Sim, da própria clínica |         Sim |
| Marcar consulta como realizada  |     Não |       Sim, se permitido |               Sim, da própria clínica |         Sim |
| Ver notificações próprias       |     Sim |                     Sim |                                   Sim |         Sim |

---

## 6.2 Regras por perfil

## Patient

Pode:

```txt
criar conta
fazer login
ver próprio perfil
editar próprio perfil
listar clínicas ativas
listar especialidades ativas
listar médicos ativos
ver horários disponíveis
criar consulta para si mesmo
ver próprias próximas consultas
ver próprio histórico
cancelar própria consulta futura
ler próprias notificações
```

Não pode:

```txt
criar clínica
editar clínica
desativar clínica
criar médico
editar médico
criar especialidade
criar disponibilidade médica
ver consultas de outros pacientes
ver consultas administrativas da clínica
vincular médicos a clínicas
vincular admins a clínicas
```

---

## Doctor

Pode:

```txt
fazer login
ver próprio perfil
editar dados básicos do próprio perfil
ver consultas vinculadas ao próprio doctor_id
ver própria agenda
ler próprias notificações
marcar consulta como realizada, se essa regra for habilitada no backend
```

Não pode:

```txt
criar clínica
editar clínica
criar médico
editar outros médicos
criar especialidade
criar disponibilidade
ver consultas de outros médicos
ver consultas de clínicas não relacionadas
vincular admin
vincular médico à clínica
```

---

## Admin

Pode:

```txt
fazer login
ver próprio perfil
editar próprio perfil
ver clínicas às quais está vinculado
editar dados básicos das clínicas vinculadas, se permitido
criar médicos para clínicas vinculadas
editar médicos das clínicas vinculadas
desativar médicos das clínicas vinculadas
vincular médicos às clínicas vinculadas
vincular médicos a especialidades
criar disponibilidade para médicos das clínicas vinculadas
editar disponibilidade para médicos das clínicas vinculadas
ver consultas das clínicas vinculadas
confirmar consultas das clínicas vinculadas
cancelar consultas das clínicas vinculadas
marcar consultas como realizadas nas clínicas vinculadas
```

Não pode:

```txt
criar clínica
desativar clínica
ver clínicas não vinculadas
gerenciar médicos de clínicas não vinculadas
gerenciar consultas de clínicas não vinculadas
criar super_admin
criar especialidades globais
desativar especialidades globais
vincular admins a clínicas
```

---

## Super Admin

Pode:

```txt
criar clínicas
editar clínicas
desativar clínicas
criar admins
vincular admins a clínicas
remover vínculo de admins com clínicas
criar especialidades
editar especialidades
desativar especialidades
ver todos os pacientes
ver todos os médicos
ver todas as clínicas
ver todas as consultas
gerenciar dados globais da plataforma
```

Não deve:

```txt
burlar validações de integridade do domínio
criar consulta em horário indisponível
criar consulta com médico inativo
criar consulta com clínica inativa
criar consulta com especialidade inativa
```

Mesmo o super admin deve respeitar regras críticas de consistência do domínio.

---

## 7. Fluxos obrigatórios contemplados pela modelagem

## 7.1 Fluxo de criação de clínica

```txt
1. Usuário super_admin autenticado envia dados da clínica
2. API valida role super_admin
3. API valida dados obrigatórios
4. API cria registro em clinics
5. API registra created_by_user_id
6. Clínica nasce active = true
```

Critérios:

- `admin` não pode criar clínica.
- `doctor` não pode criar clínica.
- `patient` não pode criar clínica.
- Clínica criada deve aparecer em listagens administrativas.
- Clínica criada deve poder receber vínculo de admin e médicos.

---

## 7.2 Fluxo de criação de admin de clínica

```txt
1. super_admin cria usuário com role admin
2. super_admin vincula usuário admin a uma clínica
3. API cria registro em clinic_admins
4. Admin passa a ter acesso somente àquela clínica
```

Critérios:

- Apenas `super_admin` pode vincular admin à clínica.
- Não deve existir vínculo duplicado entre mesmo admin e mesma clínica.
- Admin sem vínculo com clínica não deve gerenciar dados clínicos.

---

## 7.3 Fluxo de criação de médico

```txt
1. admin autenticado seleciona clínica que gerencia
2. admin cria usuário com role doctor
3. API cria registro em users
4. API cria registro em doctors
5. API cria vínculo em doctor_clinics
6. API cria vínculo com especialidade em doctor_specialties
```

Critérios:

- Admin só pode criar médico em clínica vinculada a ele.
- Super admin pode criar médico para qualquer clínica.
- Paciente não pode criar médico.
- Médico não pode criar outro médico.
- Médico criado deve possuir `user_id`.
- Médico criado deve possuir CRM único.
- Médico só aparece na listagem pública se estiver ativo e vinculado a clínica ativa.

---

## 7.4 Fluxo de cadastro de paciente

```txt
1. Usuário informa nome, e-mail, telefone e senha
2. API cria registro em users com role patient
3. API cria registro em patients
4. API retorna dados seguros e token JWT
```

Critérios:

- E-mail deve ser único.
- Senha deve ser salva como hash.
- `password_hash` não deve ser retornado.
- Paciente criado deve conseguir fazer login.
- Paciente deve conseguir consultar e editar somente o próprio perfil.

---

## 7.5 Fluxo de criação de disponibilidade

```txt
1. admin seleciona clínica vinculada
2. admin seleciona médico vinculado à clínica
3. admin informa dia da semana, horário inicial, horário final e duração do slot
4. API valida vínculo doctor_clinics
5. API cria doctor_availabilities
```

Critérios:

- Admin só pode criar disponibilidade em clínica vinculada a ele.
- Médico precisa estar vinculado à clínica.
- Clínica precisa estar ativa.
- Médico precisa estar ativo.
- `weekday` precisa estar entre 0 e 6.
- `start_time` precisa ser menor que `end_time`.
- `slot_duration_minutes` precisa ser maior que zero.

---

## 7.6 Fluxo de consulta de horários disponíveis

```txt
1. Paciente escolhe médico, clínica e data
2. API busca disponibilidade do médico para o weekday da data
3. API gera slots com base em start_time, end_time e slot_duration_minutes
4. API remove horários ocupados por consultas scheduled ou confirmed
5. API retorna lista de horários disponíveis
```

Critérios:

- Horários ocupados não devem aparecer como disponíveis.
- Horários cancelados devem voltar a aparecer.
- Disponibilidade inativa não deve gerar horário.
- Médico inativo não deve gerar horário.
- Clínica inativa não deve gerar horário.
- Data sem disponibilidade deve retornar lista vazia.

---

## 7.7 Fluxo de criação de consulta

```txt
1. Paciente autenticado seleciona médico, clínica, especialidade, data e horário
2. API valida se paciente existe e está ativo
3. API valida se médico está ativo
4. API valida se clínica está ativa
5. API valida se especialidade está ativa
6. API valida se médico está vinculado à clínica
7. API valida se médico possui a especialidade selecionada
8. API valida se horário existe na disponibilidade
9. API valida se não existe consulta ativa no mesmo médico, data e horário
10. API valida se paciente não possui outra consulta ativa no mesmo horário
11. API cria appointment com status scheduled
12. API registra created_by_user_id
```

Critérios:

- Consulta válida deve ser criada com status `scheduled`.
- Consulta inválida por conflito deve retornar erro.
- Consulta em data passada deve ser bloqueada.
- Consulta fora da agenda deve ser bloqueada.
- Consulta com médico inativo deve ser bloqueada.
- Consulta com clínica inativa deve ser bloqueada.
- Consulta com especialidade inativa deve ser bloqueada.
- Consulta deve aparecer em próximas consultas do paciente.

---

## 7.8 Fluxo de cancelamento de consulta

```txt
1. Paciente, admin ou super_admin solicita cancelamento
2. API valida permissão do usuário
3. API valida se consulta existe
4. API valida se consulta pode ser cancelada
5. API altera status para canceled
6. API salva cancel_reason
7. API salva canceled_by_user_id
```

Critérios:

- Paciente só pode cancelar própria consulta.
- Admin só pode cancelar consulta de clínica vinculada.
- Super admin pode cancelar qualquer consulta.
- Médico não deve cancelar consulta, exceto se regra futura permitir.
- Consulta completed não pode ser cancelada.
- Consulta no_show não pode ser cancelada.
- Consulta cancelada deve liberar horário.
- Consulta cancelada deve aparecer no histórico.

---

## 8. Requisitos técnicos

## 8.1 Banco

- Usar MySQL.
- Usar Prisma ORM.
- Criar migrations versionadas.
- Não criar tabelas manualmente fora do Prisma.
- Todos os models principais devem ter `createdAt` e `updatedAt`.
- Usar nomes de campos no padrão camelCase no Prisma.
- Mapear nomes de colunas no banco em snake_case se esse for o padrão adotado.

---

## 8.2 Integridade

A modelagem deve conter:

- Chaves primárias.
- Chaves estrangeiras.
- Índices necessários.
- Uniques necessários.
- Enums necessários.
- Relacionamentos explícitos.

Uniques obrigatórios:

```txt
users.email
patients.user_id
doctors.user_id
doctors.crm
specialties.name
clinic_admins.clinic_id + clinic_admins.user_id
doctor_clinics.doctor_id + doctor_clinics.clinic_id
doctor_specialties.doctor_id + doctor_specialties.specialty_id
```

Índices recomendados:

```txt
appointments.patient_id
appointments.doctor_id
appointments.clinic_id
appointments.specialty_id
appointments.date
appointments.status
appointments.doctor_id + appointments.date + appointments.start_time
appointments.patient_id + appointments.date + appointments.start_time
doctor_availabilities.doctor_id
doctor_availabilities.clinic_id
doctor_availabilities.weekday
clinic_admins.user_id
doctor_clinics.clinic_id
doctor_specialties.specialty_id
```

---

## 8.3 Soft delete

Não remover fisicamente registros principais no MVP.

Usar `active = false` para:

```txt
users
clinics
doctors
specialties
clinic_admins
doctor_clinics
doctor_availabilities
```

Consultas devem preservar histórico via `status`.

---

## 9. Critérios de aceite gerais

A tarefa será aceita somente se todos os critérios abaixo forem atendidos.

## 9.1 Prisma schema

- Deve existir um `schema.prisma` válido.
- O datasource deve usar provider `mysql`.
- Deve existir enum `UserRole`.
- Deve existir enum `AppointmentStatus`.
- Todos os models definidos nesta tarefa devem existir.
- Todos os relacionamentos principais devem estar modelados.
- Todos os campos obrigatórios devem estar presentes.
- Todos os campos de auditoria devem estar presentes.
- `npx prisma validate` deve executar sem erros.
- `npx prisma format` deve executar sem erros.

---

## 9.2 Migration

- Deve existir migration inicial versionada.
- `npx prisma migrate dev` deve executar com sucesso em banco limpo.
- Todas as tabelas devem ser criadas no MySQL.
- Todas as foreign keys devem ser criadas.
- Todos os índices definidos como obrigatórios devem ser criados.
- Todos os uniques definidos como obrigatórios devem ser criados.
- O Prisma Client deve ser gerado sem erro.

---

## 9.3 Seed

- Deve existir seed inicial de especialidades.
- Seed deve criar as especialidades obrigatórias.
- Seed deve ser idempotente.
- Rodar seed mais de uma vez não deve duplicar especialidades.
- Especialidades criadas devem possuir `active = true`.

---

## 9.4 Autenticação e roles

- Deve ser possível representar usuários dos tipos `patient`, `doctor`, `admin` e `super_admin`.
- A tabela `users` deve centralizar autenticação.
- Não deve haver senha duplicada em tabelas de perfil.
- `patients`, `doctors` e admins devem depender de `users`.
- O modelo deve permitir identificar a role do usuário autenticado.
- O modelo deve permitir verificar quais clínicas um admin gerencia.

---

## 9.5 Clínicas

- Deve existir tabela `clinics`.
- Deve existir campo `created_by_user_id`.
- Deve ser possível identificar quem criou a clínica.
- Deve ser possível desativar clínica sem remover registro.
- Deve ser possível vincular admins à clínica.
- Deve ser possível vincular médicos à clínica.
- Deve ser possível criar consultas relacionadas a uma clínica.

---

## 9.6 Admins de clínica

- Deve existir tabela `clinic_admins`.
- Deve ser possível vincular um admin a uma ou mais clínicas.
- Deve ser possível uma clínica possuir mais de um admin.
- Deve existir unique para impedir duplicidade do mesmo admin na mesma clínica.
- Deve existir campo `active`.
- O modelo deve permitir revogar acesso do admin a uma clínica sem apagar histórico.

---

## 9.7 Médicos

- Deve existir tabela `doctors`.
- Médico deve estar vinculado a `users`.
- Médico deve possuir `crm` único.
- Médico deve poder ser vinculado a uma ou mais clínicas.
- Médico deve poder ser vinculado a uma ou mais especialidades.
- Médico inativo deve ser representado por `active = false`.

---

## 9.8 Especialidades

- Deve existir tabela `specialties`.
- Especialidade deve possuir nome único.
- Especialidade deve poder ser desativada.
- Especialidade deve poder ser vinculada a múltiplos médicos.
- Médico deve poder possuir múltiplas especialidades.
- Seed deve criar especialidades iniciais.

---

## 9.9 Disponibilidade

- Deve existir tabela `doctor_availabilities`.
- Disponibilidade deve estar vinculada a médico e clínica.
- Deve existir `weekday`.
- Deve existir `start_time`.
- Deve existir `end_time`.
- Deve existir `slot_duration_minutes`.
- Deve existir `active`.
- O modelo deve permitir calcular horários disponíveis por médico, clínica e data.

---

## 9.10 Consultas

- Deve existir tabela `appointments`.
- Consulta deve estar vinculada a paciente, médico, clínica e especialidade.
- Consulta deve possuir `date`, `start_time` e `end_time`.
- Consulta deve possuir `status`.
- Consulta deve possuir `created_by_user_id`.
- Consulta deve possuir `canceled_by_user_id`.
- Consulta deve possuir `cancel_reason`.
- Status deve aceitar `scheduled`, `confirmed`, `completed`, `canceled` e `no_show`.
- O modelo deve permitir listar próximas consultas.
- O modelo deve permitir listar histórico.
- O modelo deve permitir verificar conflito por médico, data e horário.
- O modelo deve permitir verificar conflito por paciente, data e horário.

---

## 9.11 Notificações

- Deve existir tabela `notifications`.
- Notificação deve estar vinculada a `users`.
- Deve existir campo `read`.
- Deve ser possível listar notificações por usuário.
- Deve ser possível marcar notificação como lida.

---

## 10. Critérios de aceite de fluxo

## 10.1 Fluxo administrativo

A modelagem deve permitir o seguinte fluxo sem alteração estrutural futura:

```txt
super_admin cria clínica
super_admin cria admin
super_admin vincula admin à clínica
admin cria médico na clínica
admin vincula médico à especialidade
admin cria disponibilidade do médico
paciente agenda consulta
```

---

## 10.2 Fluxo do paciente

A modelagem deve permitir:

```txt
paciente cria conta
paciente faz login
paciente lista especialidades
paciente lista médicos
paciente visualiza horários disponíveis
paciente cria consulta
paciente vê próximas consultas
paciente vê histórico
paciente cancela consulta
```

---

## 10.3 Fluxo do médico

A modelagem deve permitir:

```txt
médico faz login
médico visualiza perfil
médico visualiza consultas vinculadas ao seu doctor_id
médico visualiza agenda por data
```

---

## 10.4 Fluxo do admin da clínica

A modelagem deve permitir:

```txt
admin faz login
admin visualiza clínicas vinculadas
admin gerencia médicos das clínicas vinculadas
admin gerencia disponibilidade dos médicos das clínicas vinculadas
admin visualiza consultas das clínicas vinculadas
admin cancela ou confirma consultas das clínicas vinculadas
```

---

## 11. Fora do escopo desta tarefa

Esta tarefa não inclui:

- Implementação completa das rotas HTTP.
- Implementação dos controllers.
- Implementação da autenticação JWT.
- Implementação dos middlewares de autorização.
- Implementação da regra de cálculo de slots.
- Implementação da regra de conflito em service.
- Integração com app mobile.
- Painel administrativo.
- Upload de imagens.
- Envio real de notificações push.
- Recuperação de senha.

Esta tarefa entrega somente a modelagem, migrations e seed inicial do banco.

---

## 12. Resultado esperado

Ao final desta tarefa, o projeto deve possuir uma base de dados capaz de sustentar o MVP da API Agendei, incluindo autenticação, perfis, clínicas, médicos, especialidades, disponibilidade, consultas, permissões e notificações.

A modelagem deve ser suficiente para iniciar as próximas tarefas do backlog:

```txt
Criar módulo de auth
Criar módulo de patients
Criar módulo de specialties
Criar módulo de doctors
Criar módulo de availability
Criar módulo de appointments
Criar regra de conflito de agendamento
```

---

## 13. Checklist final

Antes de marcar esta tarefa como concluída, validar:

```txt
[ ] schema.prisma usa provider mysql
[ ] enum UserRole criado
[ ] enum AppointmentStatus criado
[ ] model User criado
[ ] model Patient criado
[ ] model Clinic criado
[ ] model ClinicAdmin criado
[ ] model Doctor criado
[ ] model DoctorClinic criado
[ ] model Specialty criado
[ ] model DoctorSpecialty criado
[ ] model DoctorAvailability criado
[ ] model Appointment criado
[ ] model Notification criado
[ ] uniques obrigatórios criados
[ ] índices recomendados criados
[ ] relacionamentos Prisma funcionando
[ ] migration inicial criada
[ ] migration executa em banco limpo
[ ] Prisma Client é gerado
[ ] seed de especialidades criado
[ ] seed é idempotente
[ ] npx prisma validate executa sem erro
[ ] npx prisma format executa sem erro
[ ] estrutura suporta patient, doctor, admin e super_admin
[ ] estrutura suporta vínculo de admin com clínica
[ ] estrutura suporta vínculo de médico com clínica
[ ] estrutura suporta vínculo de médico com especialidade
[ ] estrutura suporta disponibilidade por médico e clínica
[ ] estrutura suporta consulta com paciente, médico, clínica e especialidade
[ ] estrutura suporta verificação de conflito por médico/data/horário
[ ] estrutura suporta verificação de conflito por paciente/data/horário
```
