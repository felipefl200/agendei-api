import argon2 from 'argon2'

import type { PasswordHasher } from './auth.ports.js'

// OWASP mínimo: m=19456, t=2, p=1
// Recomendado para servidores modernos: m=65536, t=3, p=4
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3, // iterações
  parallelism: 4, // threads
}

export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password)
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(passwordHash, password)
  }
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, HASH_OPTIONS)
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, password)
}
