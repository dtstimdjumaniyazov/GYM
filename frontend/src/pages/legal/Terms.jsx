import LegalPage from '../../components/LegalPage'
import content from '../../../../docs/drafts/1_user-agreement.md?raw'

function Terms() {
  return (
    <LegalPage
      title="Пользовательское соглашение"
      subtitle="Публичная оферта об оказании услуг"
      content={content}
    />
  )
}

export default Terms
