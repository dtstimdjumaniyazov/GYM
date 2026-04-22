import json
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

signer = TimestampSigner(salt='social-auth-link')


def create_social_token(provider, social_id, extra_data=None):
    """Create a signed token for pending social auth (valid 15 minutes)."""
    payload = json.dumps({
        'provider': provider,
        'social_id': str(social_id),
        'extra': extra_data or {},
    })
    return signer.sign(payload)


def verify_social_token(token, max_age=900):
    """Verify and decode social auth token. Returns dict or None."""
    try:
        payload = signer.unsign(token, max_age=max_age)
        return json.loads(payload)
    except (BadSignature, SignatureExpired):
        return None
