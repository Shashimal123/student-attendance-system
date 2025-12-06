import { prisma } from './prisma'
import { randomBytes } from 'crypto'

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function base58Encode(buffer: Buffer): string {
  let result = ''
  let num = BigInt('0x' + buffer.toString('hex'))
  
  if (num === 0n) return BASE58_ALPHABET[0]
  
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result
    num = num / 58n
  }
  
  return result
}

function generateShortId(): string {
  const bytes = randomBytes(6)
  const encoded = base58Encode(bytes)
  return encoded.slice(0, 8).toUpperCase()
}

export async function generateStudentId(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const shortId = generateShortId()
    const studentId = `STD-${shortId}`

    const existing = await prisma.student.findUnique({
      where: { studentId }
    })

    if (!existing) {
      return studentId
    }

    attempts++
  }

  throw new Error('Failed to generate unique student ID after multiple attempts')
}

export function generateShortStudentId(): string {
  const shortId = generateShortId()
  return `STD-${shortId}`
}
