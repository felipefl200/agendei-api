import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'

import type {
  AvatarStorage,
  ProfileAvatar,
  ProfileAvatarRepository,
  UploadAvatarFile,
} from './profile.ports.js'
import { createProfileService } from './profile.service.js'

const avatarFile: UploadAvatarFile = {
  buffer: Buffer.from('avatar'),
  mimetype: 'image/png',
}

function createRepository(profile: ProfileAvatar | null) {
  const findByUser = vi.fn().mockResolvedValue(profile)
  const updateAvatarUrl = vi.fn(
    (
      input: Parameters<ProfileAvatarRepository['updateAvatarUrl']>[0],
    ): Promise<ProfileAvatar> =>
      Promise.resolve({
        id: input.id,
        type: input.type,
        avatarUrl: input.avatarUrl,
      }),
  )
  const repository: ProfileAvatarRepository = {
    findByUser,
    updateAvatarUrl,
  }

  return {
    findByUser,
    repository,
    updateAvatarUrl,
  }
}

function createStorage() {
  const save = vi.fn().mockResolvedValue({
    url: 'http://localhost:3333/uploads/avatars/avatar.png',
  })
  const deleteByUrl = vi.fn().mockResolvedValue(undefined)
  const storage: AvatarStorage = {
    deleteByUrl,
    save,
  }

  return {
    deleteByUrl,
    save,
    storage,
  }
}

describe('profile service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates patient avatar and removes previous local avatar', async () => {
    const { findByUser, repository, updateAvatarUrl } = createRepository({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: 'http://localhost:3333/uploads/avatars/old.png',
    })
    const { deleteByUrl, save, storage } = createStorage()
    const service = createProfileService({
      avatarRepository: repository,
      avatarStorage: storage,
    })

    const profile = await service.updateAvatar(
      { id: 'user-id', role: 'patient' },
      avatarFile,
    )

    expect(findByUser).toHaveBeenCalledWith({
      userId: 'user-id',
      role: 'patient',
    })
    expect(save).toHaveBeenCalledWith({
      profileId: 'patient-id',
      profileType: 'patient',
      file: avatarFile,
    })
    expect(updateAvatarUrl).toHaveBeenCalledWith({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: 'http://localhost:3333/uploads/avatars/avatar.png',
    })
    expect(deleteByUrl).toHaveBeenCalledWith(
      'http://localhost:3333/uploads/avatars/old.png',
    )
    expect(profile).toEqual({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: 'http://localhost:3333/uploads/avatars/avatar.png',
    })
  })

  it('updates doctor avatar', async () => {
    const { repository, updateAvatarUrl } = createRepository({
      id: 'doctor-id',
      type: 'doctor',
      avatarUrl: null,
    })
    const { save, storage } = createStorage()
    const service = createProfileService({
      avatarRepository: repository,
      avatarStorage: storage,
    })

    await service.updateAvatar({ id: 'user-id', role: 'doctor' }, avatarFile)

    expect(save).toHaveBeenCalledWith({
      profileId: 'doctor-id',
      profileType: 'doctor',
      file: avatarFile,
    })
    expect(updateAvatarUrl).toHaveBeenCalledWith({
      id: 'doctor-id',
      type: 'doctor',
      avatarUrl: 'http://localhost:3333/uploads/avatars/avatar.png',
    })
  })

  it('returns 404 when the authenticated user has no supported profile', async () => {
    const { repository } = createRepository(null)
    const { save, storage } = createStorage()
    const service = createProfileService({
      avatarRepository: repository,
      avatarStorage: storage,
    })

    await expect(
      service.updateAvatar({ id: 'user-id', role: 'admin' }, avatarFile),
    ).rejects.toMatchObject(new AppError('Profile not found', 404))
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects unsupported file types', async () => {
    const { findByUser, repository } = createRepository({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: null,
    })
    const { storage } = createStorage()
    const service = createProfileService({
      avatarRepository: repository,
      avatarStorage: storage,
    })

    await expect(
      service.updateAvatar(
        { id: 'user-id', role: 'patient' },
        {
          buffer: Buffer.from('not-image'),
          mimetype: 'text/plain',
        },
      ),
    ).rejects.toMatchObject(new AppError('Invalid avatar file type', 400))
    expect(findByUser).not.toHaveBeenCalled()
  })

  it('rejects files above the configured size limit', async () => {
    const { findByUser, repository } = createRepository({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: null,
    })
    const { storage } = createStorage()
    const service = createProfileService({
      avatarRepository: repository,
      avatarStorage: storage,
    })

    await expect(
      service.updateAvatar(
        { id: 'user-id', role: 'patient' },
        {
          buffer: Buffer.alloc(2_097_153),
          mimetype: 'image/png',
        },
      ),
    ).rejects.toMatchObject(new AppError('Avatar file is too large', 400))
    expect(findByUser).not.toHaveBeenCalled()
  })
})
