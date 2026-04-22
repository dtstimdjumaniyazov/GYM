import LegalPage from '../../components/LegalPage'
import content from '../../../../docs/drafts/2_privacy-policy.md?raw'

function Privacy() {
  return (
    <LegalPage
      title="Политика конфиденциальности"
      content={content}
    />
  )
}

export default Privacy
