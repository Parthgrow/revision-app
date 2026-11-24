import AgentPage, { type AgentPageProps } from '@revision-app/core/pages/tracker/AgentPage'
import AppFrame from '@/components/AppFrame'

export default function Page(props: AgentPageProps) {
  return <AgentPage {...props} Frame={AppFrame} />
}
