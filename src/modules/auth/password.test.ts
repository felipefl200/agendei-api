import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password.js'

describe('password hashing', () => {
  it('hashes passwords using argon2id', async () => {
    const passwordHash = await hashPassword('strong-password-123')

    expect(passwordHash).toMatch(/^\$argon2id\$/)
    await expect(
      verifyPassword(passwordHash, 'strong-password-123'),
    ).resolves.toBe(true)
  })

  it('rejects invalid passwords', async () => {
    const passwordHash = await hashPassword('strong-password-123')

    await expect(verifyPassword(passwordHash, 'wrong-password')).resolves.toBe(
      false,
    )
  })
})
