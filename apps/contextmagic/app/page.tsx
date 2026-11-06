import { redirect } from 'next/navigation'

// ContextMagic is the Context module on its own: the home page is the project list.
export default function Home() {
  redirect('/context')
}
