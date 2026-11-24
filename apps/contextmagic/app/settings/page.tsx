import SettingsPage from '@revision-app/core/pages/SettingsPage'
import ClaudeSetup from '@revision-app/core/ui/tracker/ClaudeSetup'
import AppFrame from '@/components/AppFrame'

export default function Page() {
  return (
    <SettingsPage Frame={AppFrame}>
      <ClaudeSetup />
    </SettingsPage>
  )
}
