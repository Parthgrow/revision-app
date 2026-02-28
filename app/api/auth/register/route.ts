import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createUser } from '@/lib/kv'
import { signToken, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const existing = await getUserByEmail(email)
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const user = await createUser(email, password)
  const token = await signToken({ userId: user.id, email: user.email })
  await setSessionCookie(token)

  return NextResponse.json({ ok: true })
}
