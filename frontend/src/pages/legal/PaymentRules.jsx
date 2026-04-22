import LegalPage from '../../components/LegalPage'
import content from '../../../../docs/drafts/5_payment-and-refund-rules.md?raw'

function PaymentRules() {
  return (
    <LegalPage
      title="Правила оплаты и возврата"
      content={content}
    />
  )
}

export default PaymentRules
