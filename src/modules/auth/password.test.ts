import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password.js'

describe('password hashing', () => {
  it('hashes passwords using bcrypt', async () => {
    const passwordHash = await hashPassword('strong-password-123')

    expect(passwordHash).toMatch(/^\$2[aby]\$/)
    await expect(
      verifyPassword('strong-password-123', passwordHash),
    ).resolves.toBe(true)
  })

  it('rejects invalid passwords', async () => {
    const passwordHash = await hashPassword('strong-password-123')

    await expect(verifyPassword('wrong-password', passwordHash)).resolves.toBe(
      false,
    )
  })

  it('rejects passwords above bcrypt byte limit', async () => {
    const password = 'á'.repeat(37)

    await expect(hashPassword(password)).rejects.toThrow(
      'A senha não pode ultrapassar 72 bytes.',
    )
    await expect(verifyPassword(password, 'hash')).rejects.toThrow(
      'A senha não pode ultrapassar 72 bytes.',
    )
  })
})
