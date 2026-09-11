import { redirect } from 'next/navigation'

// The library and the review queue are one screen now — see app/HomeClient.tsx.
export default function BrowsePage() {
  redirect('/')
}
