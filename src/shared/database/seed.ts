import { fakerPT_BR as faker } from '@faker-js/faker'

import {
  appointments,
  clinicAdmins,
  clinics,
  doctorAvailabilities,
  doctorClinics,
  doctors,
  doctorSpecialties,
  notifications,
  patients,
  specialties,
  users,
} from './schema/index.js'
import { db } from './index.js'

async function clear() {
  console.log('🧹 Limpando o banco de dados...')
  await db.delete(appointments)
  await db.delete(notifications)
  await db.delete(doctorAvailabilities)
  await db.delete(doctorSpecialties)
  await db.delete(doctorClinics)
  await db.delete(clinicAdmins)
  await db.delete(patients)
  await db.delete(doctors)
  await db.delete(clinics)
  await db.delete(specialties)
  await db.delete(users)
}

async function seed() {
  console.log('🌱 Populando especialidades...')

  const specialtiesData = [
    { id: crypto.randomUUID(), name: 'Clínica Geral' },
    { id: crypto.randomUUID(), name: 'Cardiologia' },
    { id: crypto.randomUUID(), name: 'Pediatria' },
    { id: crypto.randomUUID(), name: 'Ginecologia' },
    { id: crypto.randomUUID(), name: 'Dermatologia' },
    { id: crypto.randomUUID(), name: 'Ortopedia' },
  ]

  await db.insert(specialties).values(specialtiesData)

  console.log('🌱 Populando usuários...')

  // Criar 1 Admin
  const adminId = crypto.randomUUID()
  await db.insert(users).values({
    id: adminId,
    name: 'Admin Agendei',
    email: 'admin@agendei.com',
    passwordHash: 'dummy-hash',
    role: 'super_admin',
  })

  // Criar Clínicas e seus Admins Locais
  console.log('🌱 Populando clínicas...')
  const clinicsIds: string[] = []
  for (let i = 0; i < 3; i++) {
    const clinicUserId = crypto.randomUUID()
    const gender = faker.helpers.arrayElement(['male', 'female'])
    const firstName = faker.person.firstName(gender)
    const lastName = faker.person.lastName(gender)
    await db.insert(users).values({
      id: clinicUserId,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLocaleLowerCase(),
      passwordHash: 'dummy-hash',
      role: 'admin',
    })

    const clinicId = crypto.randomUUID()
    clinicsIds.push(clinicId)

    await db.insert(clinics).values({
      id: clinicId,
      name: faker.company.name(),
      corporateName:
        faker.company.name() +
        faker.helpers.arrayElement([
          ' LTDA',
          ' S.A.',
          ' EIRELI',
          ' CORP',
          ' ME',
        ]),
      document: faker.string.numeric(14),
      phone: faker.phone.number(),
      email: faker.internet.email().toLocaleLowerCase(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      createdByUserId: adminId,
    })

    await db.insert(clinicAdmins).values({
      clinicId,
      userId: clinicUserId,
    })
  }

  // Criar Médicos
  console.log('🌱 Populando médicos...')
  const doctorsIds: string[] = []
  for (let i = 0; i < 5; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female'])
    const firstName = faker.person.firstName(gender)
    const lastName = faker.person.lastName(gender)
    const doctorUserId = crypto.randomUUID()
    await db.insert(users).values({
      id: doctorUserId,
      name: `${gender === 'male' ? 'Dr.' : 'Dra.'} ${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLocaleLowerCase(),
      passwordHash: 'dummy-hash',
      role: 'doctor',
    })

    const doctorId = crypto.randomUUID()
    doctorsIds.push(doctorId)

    await db.insert(doctors).values({
      id: doctorId,
      userId: doctorUserId,
      crm: faker.string.numeric(6),
      bio: faker.lorem.paragraph(),
      avatarUrl: faker.image.avatar(),
    })

    // Associar Médico a 1 Especialidade (aleatória)
    const randomSpecialty = faker.helpers.arrayElement(specialtiesData)
    await db.insert(doctorSpecialties).values({
      doctorId,
      specialtyId: randomSpecialty.id,
    })

    // Associar Médico a 1 ou 2 Clínicas
    const randomClinics = faker.helpers.arrayElements(clinicsIds, {
      min: 1,
      max: 2,
    })
    for (const clinicId of randomClinics) {
      await db.insert(doctorClinics).values({
        doctorId,
        clinicId,
      })

      // Gerar Disponibilidade para essa Clínica
      await db.insert(doctorAvailabilities).values({
        doctorId,
        clinicId,
        weekday: faker.number.int({ min: 1, max: 5 }), // Seg a Sex
        startTime: '08:00:00',
        endTime: '12:00:00',
        slotDurationMinutes: 30, // minutos
      })
    }
  }

  // Criar Pacientes
  console.log('🌱 Populando pacientes...')
  const patientsIds: string[] = []
  for (let i = 0; i < 10; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female'])
    const firstName = faker.person.firstName(gender)
    const lastName = faker.person.lastName(gender)
    const patientUserId = crypto.randomUUID()
    await db.insert(users).values({
      id: patientUserId,
      name: `${gender === 'male' ? 'Sr.' : 'Sra.'} ${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLocaleLowerCase(),
      passwordHash: 'dummy-hash',
      role: 'patient',
    })

    const patientId = crypto.randomUUID()
    patientsIds.push(patientId)

    await db.insert(patients).values({
      id: patientId,
      userId: patientUserId,
      phone: faker.phone.number(),
      document: faker.string.numeric(11),
      birthDate: faker.date.birthdate({ mode: 'age', min: 18, max: 65 }),
    })
  }

  // Criar Agendamentos
  console.log('🌱 Populando agendamentos...')
  for (let i = 0; i < 5; i++) {
    const randomPatientId = faker.helpers.arrayElement(patientsIds)
    const randomDoctorId = faker.helpers.arrayElement(doctorsIds)
    const randomClinicId = faker.helpers.arrayElement(clinicsIds)
    const randomSpecialtyId = faker.helpers.arrayElement(specialtiesData).id

    await db.insert(appointments).values({
      patientId: randomPatientId,
      doctorId: randomDoctorId,
      clinicId: randomClinicId,
      specialtyId: randomSpecialtyId,
      date: faker.date.soon({ days: 10 }),
      startTime: '09:00:00',
      endTime: '09:30:00',
      status: 'scheduled',
      createdByUserId: adminId, // Para simplificar o dummy
    })
  }

  console.log('✅ Banco de dados populado com sucesso!')
  process.exit(0)
}

async function run() {
  try {
    await clear()
    await seed()
  } catch (error) {
    console.error('❌ Erro ao rodar as seeds:', error)
    process.exit(1)
  }
}

run().catch((error) => {
  console.error('❌ Unhandled Rejection:', error)
  process.exit(1)
})
