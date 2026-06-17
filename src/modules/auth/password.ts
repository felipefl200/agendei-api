import bcrypt from 'bcryptjs'

import type { PasswordHasher } from './auth.ports.js'

export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password)
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(password, passwordHash)
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordInput(password)

  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  validatePasswordInput(password)

  return bcrypt.compare(password, passwordHash)
}

function validatePasswordInput(password: string): void {
  const passwordBytes = Buffer.byteLength(password, 'utf8')

  if (passwordBytes > 72) {
    throw new Error('A senha não pode ultrapassar 72 bytes.')
  }
}
