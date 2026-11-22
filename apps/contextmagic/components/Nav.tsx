import SideNav from '@revision-app/core/ui/SideNav'

const links = [{ href: '/context', label: 'Projects' }]

export default function Nav() {
  return <SideNav brand="ContextMagic" links={links} />
}
