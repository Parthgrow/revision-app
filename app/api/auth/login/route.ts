import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/kv'
import { signToken, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await getUserByEmail(email)
  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ userId: user.id, email: user.email })
  await setSessionCookie(token)

  return NextResponse.json({ ok: true })
}
