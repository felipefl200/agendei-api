import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/app-error.js'
import type { UserRole } from '../auth/auth.types.js'

import type {
  AvatarStorage,
  ProfileAvatar,
  ProfileAvatarRepository,
  UploadAvatarFile,
} from './profile.ports.js'

const allowedAvatarMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

type ProfileServiceDeps = {
  avatarRepository: ProfileAvatarRepository
  avatarStorage: AvatarStorage
}

type AuthenticatedUser = {
  id: string
  role: UserRole
}

function validateAvatarFile(file: UploadAvatarFile): void {
  if (!allowedAvatarMimeTypes.has(file.mimetype)) {
    throw new AppError('Invalid avatar file type', 400)
  }

  if (file.buffer.byteLength > env.AVATAR_MAX_BYTES) {
    throw new AppError('Avatar file is too large', 400)
  }
}

export function createProfileService(deps: ProfileServiceDeps) {
  async function updateAvatar(
    user: AuthenticatedUser,
    file: UploadAvatarFile,
  ): Promise<ProfileAvatar> {
    validateAvatarFile(file)

    const profile = await deps.avatarRepository.findByUser({
      userId: user.id,
      role: user.role,
    })

    if (!profile) {
      throw new AppError('Profile not found', 404)
    }

    const storedAvatar = await deps.avatarStorage.save({
      profileId: profile.id,
      profileType: profile.type,
      file,
    })

    try {
      const updatedProfile = await deps.avatarRepository.updateAvatarUrl({
        id: profile.id,
        type: profile.type,
        avatarUrl: storedAvatar.url,
      })

      if (profile.avatarUrl) {
        await deps.avatarStorage.deleteByUrl(profile.avatarUrl)
      }

      return updatedProfile
    } catch (error) {
      await deps.avatarStorage.deleteByUrl(storedAvatar.url)
      throw error
    }
  }

  return {
    updateAvatar,
  }
}

export type ProfileService = ReturnType<typeof createProfileService>
