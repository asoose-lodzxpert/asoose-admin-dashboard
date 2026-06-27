import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign In — Asoose Admin',
}

export default function LoginPage() {
  return <LoginForm />
}
