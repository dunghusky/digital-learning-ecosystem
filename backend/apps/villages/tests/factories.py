from apps.core.models import PublicationStatus
from apps.villages.models import CraftType, CraftVillage, FormerRegion


def create_village(code: str = "tra-loc", **overrides) -> CraftVillage:
    """Minimal published village; pass overrides for whatever the test cares about."""
    values = {
        "name": "Lang non la Tra Loc",
        "craft_type": CraftType.CONICAL_HAT,
        "main_products": "Non la",
        "former_region": FormerRegion.QUANG_TRI,
        "status": PublicationStatus.PUBLISHED,
    }
    return CraftVillage.objects.create(code=code, **(values | overrides))
