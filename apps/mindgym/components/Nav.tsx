import SideNav from '@revision-app/core/ui/SideNav'

// Library folded into Review — one list, one screen.
const links = [
  { href: '/', label: 'Review' },
  { href: '/zk', label: 'Notes' },
  { href: '/context', label: 'Context' },
  { href: '/mp', label: 'Palace' },
  { href: '/palaces', label: 'Palace Network' },
  { href: '/add', label: 'Add' },
]

export default function Nav() {
  return <SideNav brand="MindGym" links={links} />
}
