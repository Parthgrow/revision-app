import DocPage, { type DocPageProps } from '@revision-app/core/pages/context/DocPage'
import AppFrame from '@/components/AppFrame'

export default function Page(props: DocPageProps) {
  return <DocPage {...props} Frame={AppFrame} />
}
