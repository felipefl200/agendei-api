import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppError } from '../../shared/errors/app-error.js'
import type { UserRole } from '../auth/auth.types.js'

vi.mock(import('./profile.container.js'), () => ({
  profileService: {
    updateAvatar: vi.fn(),
  },
}))

const { profileService } = await import('./profile.container.js')
const { buildApp } = await import('../../app.js')

function signToken(role: UserRole = 'patient') {
  return jwt.sign({ sub: 'user-id', role }, process.env.JWT_SECRET!)
}

function multipartPayload(input: {
  fieldName?: string
  contentType?: string
  content?: string
}) {
  const boundary = '----agendei-avatar-boundary'
  const fieldName = input.fieldName ?? 'avatar'
  const contentType = input.contentType ?? 'image/png'
  const content = input.content ?? 'avatar'
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${fieldName}"; filename="avatar.png"`,
    `Content-Type: ${contentType}`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n')

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.from(body),
  }
}

describe('profile avatar routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates the authenticated patient avatar', async () => {
    vi.mocked(profileService.updateAvatar).mockResolvedValue({
      id: 'patient-id',
      type: 'patient',
      avatarUrl: 'http://localhost:3333/uploads/avatars/avatar.png',
    })
    const app = buildApp()
    const multipart = multipartPayload({})

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: {
        authorization: `Bearer ${signToken()}`,
        ...multipart.headers,
      },
      payload: multipart.payload,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(profileService.updateAvatar).toHaveBeenCalledWith(
      { id: 'user-id', role: 'patient' },
      {
        buffer: Buffer.from('avatar'),
        mimetype: 'image/png',
      },
    )
    expect(response.json()).toEqual({
      profile: {
        type: 'patient',
        avatarUrl: 'http://localhost:3333/uploads/avatars/avatar.png',
      },
    })
  })

  it('updates the authenticated doctor avatar', async () => {
    vi.mocked(profileService.updateAvatar).mockResolvedValue({
      id: 'doctor-id',
      type: 'doctor',
      avatarUrl: 'http://localhost:3333/uploads/avatars/doctor.png',
    })
    const app = buildApp()
    const multipart = multipartPayload({})

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: {
        authorization: `Bearer ${signToken('doctor')}`,
        ...multipart.headers,
      },
      payload: multipart.payload,
    })

    await app.close()

    expect(response.statusCode).toBe(200)
    expect(profileService.updateAvatar).toHaveBeenCalledWith(
      { id: 'user-id', role: 'doctor' },
      {
        buffer: Buffer.from('avatar'),
        mimetype: 'image/png',
      },
    )
    expect(response.json()).toEqual({
      profile: {
        type: 'doctor',
        avatarUrl: 'http://localhost:3333/uploads/avatars/doctor.png',
      },
    })
  })

  it('returns 401 without authentication', async () => {
    const app = buildApp()
    const multipart = multipartPayload({})

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: multipart.headers,
      payload: multipart.payload,
    })

    await app.close()

    expect(response.statusCode).toBe(401)
    expect(profileService.updateAvatar).not.toHaveBeenCalled()
  })

  it('returns 400 when the avatar file is missing', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: { authorization: `Bearer ${signToken()}` },
      payload: {},
    })

    await app.close()

    expect(response.statusCode).toBe(400)
    expect(profileService.updateAvatar).not.toHaveBeenCalled()
  })

  it('returns 400 when the multipart field is not avatar', async () => {
    const app = buildApp()
    const multipart = multipartPayload({ fieldName: 'file' })

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: {
        authorization: `Bearer ${signToken()}`,
        ...multipart.headers,
      },
      payload: multipart.payload,
    })

    await app.close()

    expect(response.statusCode).toBe(400)
    expect(profileService.updateAvatar).not.toHaveBeenCalled()
  })

  it('passes invalid MIME type to service validation', async () => {
    vi.mocked(profileService.updateAvatar).mockRejectedValue(
      new AppError('Invalid avatar file type', 400),
    )
    const app = buildApp()
    const multipart = multipartPayload({ contentType: 'text/plain' })

    const response = await app.inject({
      method: 'PUT',
      url: '/profile/avatar',
      headers: {
        authorization: `Bearer ${signToken()}`,
        ...multipart.headers,
      },
      payload: multipart.payload,
    })

    await app.close()

    expect(response.statusCode).toBe(400)
  })
})
