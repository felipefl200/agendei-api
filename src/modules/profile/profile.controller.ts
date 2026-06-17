import type { FastifyRequest } from 'fastify'

import { AppError } from '../../shared/errors/app-error.js'

import { profileService } from './profile.container.js'

export async function updateProfileAvatarController(request: FastifyRequest) {
  if (!request.user) {
    throw new AppError('Unauthenticated', 401)
  }

  if (!request.isMultipart()) {
    throw new AppError('Expected multipart/form-data', 400)
  }

  const file = await request.file()

  if (!file || file.fieldname !== 'avatar') {
    throw new AppError('Avatar file is required', 400)
  }

  try {
    const profile = await profileService.updateAvatar(request.user, {
      buffer: await file.toBuffer(),
      mimetype: file.mimetype,
    })

    return {
      profile: {
        type: profile.type,
        avatarUrl: profile.avatarUrl,
      },
    }
  } catch (error) {
    if ((error as Error & { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new AppError('Avatar file is too large', 400)
    }

    throw error
  }
}
