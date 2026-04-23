def get_lang(request):
    """Extract language from ?lang= param or Accept-Language header. Defaults to 'ru'."""
    if request:
        lang = request.query_params.get('lang') or request.GET.get('lang', '')
        if lang in ('ru', 'uz'):
            return lang
        accept = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
        if accept in ('uz', 'ru'):
            return accept
        if accept.startswith('uz'):
            return 'uz'
    return 'ru'


def loc(obj, field, lang):
    """Return localized field value, falling back to base field."""
    if lang != 'ru':
        uz_val = getattr(obj, f'{field}_{lang}', None)
        if uz_val:
            return uz_val
    return getattr(obj, field, '')
