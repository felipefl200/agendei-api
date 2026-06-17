import { eq } from 'drizzle-orm'

import { db } from '../../shared/database/index.js'
import { doctors, patients } from '../../shared/database/schema/index.js'
import type { UserRole } from '../auth/auth.types.js'

import type {
  ProfileAvatar,
  ProfileAvatarRepository,
  ProfileType,
} from './profile.ports.js'

export class DrizzleProfileAvatarRepository
  implements ProfileAvatarRepository
{
  async findByUser(input: {
    userId: string
    role: UserRole
  }): Promise<ProfileAvatar | null> {
    if (input.role === 'patient') {
      const [patient] = await db
        .select({
          id: patients.id,
          avatarUrl: patients.avatarUrl,
        })
        .from(patients)
        .where(eq(patients.userId, input.userId))
        .limit(1)

      return patient
        ? { id: patient.id, type: 'patient', avatarUrl: patient.avatarUrl }
        : null
    }

    if (input.role === 'doctor') {
      const [doctor] = await db
        .select({
          id: doctors.id,
          avatarUrl: doctors.avatarUrl,
        })
        .from(doctors)
        .where(eq(doctors.userId, input.userId))
        .limit(1)

      return doctor
        ? { id: doctor.id, type: 'doctor', avatarUrl: doctor.avatarUrl }
        : null
    }

    return null
  }

  async updateAvatarUrl(input: {
    id: string
    type: ProfileType
    avatarUrl: string
  }): Promise<ProfileAvatar> {
    if (input.type === 'patient') {
      await db
        .update(patients)
        .set({ avatarUrl: input.avatarUrl })
        .where(eq(patients.id, input.id))
    } else {
      await db
        .update(doctors)
        .set({ avatarUrl: input.avatarUrl })
        .where(eq(doctors.id, input.id))
    }

    return {
      id: input.id,
      type: input.type,
      avatarUrl: input.avatarUrl,
    }
  }
}

export const profileAvatarRepository = new DrizzleProfileAvatarRepository()
