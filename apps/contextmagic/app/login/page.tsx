import AuthForm from '@revision-app/core/ui/AuthForm'
import { loginCopy } from '../auth-copy'

export default function LoginPage() {
  return <AuthForm mode="login" copy={loginCopy} />
}
