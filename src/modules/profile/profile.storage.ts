import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '../../config/env.js'

import type { AvatarStorage, ProfileType, UploadAvatarFile } from './profile.ports.js'

const avatarExtensionsByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function uploadsRoot(): string {
  return path.resolve(env.UPLOADS_DIR)
}

function avatarsRoot(): string {
  return path.join(uploadsRoot(), 'avatars')
}

function toAvatarFilename(
  profileType: ProfileType,
  profileId: string,
  file: UploadAvatarFile,
): string {
  const extension =
    avatarExtensionsByMimeType[
      file.mimetype as keyof typeof avatarExtensionsByMimeType
    ]

  return `${profileType}-${profileId}-${randomUUID()}.${extension}`
}

function resolveLocalAvatarPathFromUrl(url: string): string | null {
  const parsedUrl = new URL(url, env.PUBLIC_BASE_URL)

  if (!parsedUrl.pathname.startsWith('/uploads/avatars/')) {
    return null
  }

  const filename = path.basename(parsedUrl.pathname)
  const filePath = path.resolve(avatarsRoot(), filename)
  const relativePath = path.relative(avatarsRoot(), filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  return filePath
}

export class LocalAvatarStorage implements AvatarStorage {
  async save(input: {
    profileId: string
    profileType: ProfileType
    file: UploadAvatarFile
  }) {
    await mkdir(avatarsRoot(), { recursive: true })

    const filename = toAvatarFilename(
      input.profileType,
      input.profileId,
      input.file,
    )
    const filePath = path.join(avatarsRoot(), filename)

    await writeFile(filePath, input.file.buffer)

    return {
      url: `${trimTrailingSlash(env.PUBLIC_BASE_URL)}/uploads/avatars/${filename}`,
    }
  }

  async deleteByUrl(url: string): Promise<void> {
    const filePath = resolveLocalAvatarPathFromUrl(url)

    if (!filePath) {
      return
    }

    try {
      await unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
}

export const localAvatarStorage = new LocalAvatarStorage()
