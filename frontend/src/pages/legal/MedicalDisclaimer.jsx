import LegalPage from '../../components/LegalPage'
import content from '../../../../docs/drafts/3_medical-disclaimer.md?raw'

function MedicalDisclaimer() {
  return (
    <LegalPage
      title="Отказ от медицинской ответственности"
      content={content}
    />
  )
}

export default MedicalDisclaimer
