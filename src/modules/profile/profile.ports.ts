import type { UserRole } from '../auth/auth.types.js'

export type ProfileType = 'patient' | 'doctor'

export type ProfileAvatar = {
  id: string
  type: ProfileType
  avatarUrl: string | null
}

export type UploadAvatarFile = {
  buffer: Buffer
  mimetype: string
}

export type StoredAvatar = {
  url: string
}

export type ProfileAvatarRepository = {
  findByUser(input: {
    userId: string
    role: UserRole
  }): Promise<ProfileAvatar | null>
  updateAvatarUrl(input: {
    id: string
    type: ProfileType
    avatarUrl: string
  }): Promise<ProfileAvatar>
}

export type AvatarStorage = {
  save(input: {
    profileId: string
    profileType: ProfileType
    file: UploadAvatarFile
  }): Promise<StoredAvatar>
  deleteByUrl(url: string): Promise<void>
}
