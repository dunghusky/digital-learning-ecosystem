from rest_framework.filters import SearchFilter


class AccentInsensitiveSearchFilter(SearchFilter):
    """``?search=`` that ignores Vietnamese diacritics: "nuoc mam" matches "nước mắm".

    Plain ``icontains`` lookups become ``unaccent__icontains`` (Postgres `unaccent`, enabled by
    the core migration). Explicit prefixes such as ``=code`` or ``^name`` keep DRF's behaviour.
    """

    def construct_search(self, field_name, queryset):
        lookup = super().construct_search(field_name, queryset)
        if lookup.endswith("__icontains"):
            return lookup.removesuffix("__icontains") + "__unaccent__icontains"
        return lookup
