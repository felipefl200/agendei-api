import argon2 from 'argon2'

import type { PasswordHasher } from './auth.ports.js'

export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password)
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(passwordHash, password)
  }
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  })
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, password)
}
