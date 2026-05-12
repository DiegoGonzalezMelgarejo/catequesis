function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string, salt: string) {
  const payload = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', payload)
  return `sha256:${toHex(digest)}`
}

export async function verifyPassword(password: string, salt: string, currentHash: string) {
  if (!currentHash.startsWith('sha256:')) {
    return currentHash === password
  }

  return (await hashPassword(password, salt)) === currentHash
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join('')
}
