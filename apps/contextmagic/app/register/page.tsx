import AuthForm from '@revision-app/core/ui/AuthForm'
import { registerCopy } from '../auth-copy'

export default function RegisterPage() {
  return <AuthForm mode="register" copy={registerCopy} />
}
