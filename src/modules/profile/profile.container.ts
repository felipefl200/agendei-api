import { profileAvatarRepository } from './profile.repositories.js'
import { createProfileService } from './profile.service.js'
import { localAvatarStorage } from './profile.storage.js'

export const profileService = createProfileService({
  avatarRepository: profileAvatarRepository,
  avatarStorage: localAvatarStorage,
})
