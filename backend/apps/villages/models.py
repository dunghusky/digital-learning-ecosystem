from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import PublishableModel


class CraftType(models.TextChoices):
    CONICAL_HAT = "conical_hat", _("Conical hat")
    FISH_SAUCE = "fish_sauce", _("Fish sauce")
    MAT_WEAVING = "mat_weaving", _("Mat weaving")
    BAMBOO_RATTAN = "bamboo_rattan", _("Bamboo and rattan")
    WOODWORK = "woodwork", _("Woodwork and carving")
    RICE_WINE = "rice_wine", _("Rice wine")
    NOODLES_CAKES = "noodles_cakes", _("Noodles and cakes")
    METALWORK = "metalwork", _("Forging and casting")
    PAPER_FAN = "paper_fan", _("Paper fan")
    BROOM = "broom", _("Broom making")
    FOOD_SPECIALTY = "food_specialty", _("Other food specialty")
    OTHER = "other", _("Other")


class RecognitionStatus(models.TextChoices):
    TRADITIONAL_VILLAGE = "traditional_village", _("Recognized traditional craft village")
    VILLAGE = "village", _("Recognized craft village")
    TRADITIONAL_CRAFT = "traditional_craft", _("Recognized traditional craft")
    NOT_RECOGNIZED = "not_recognized", _("Not recognized")
    UNKNOWN = "unknown", _("Unknown")


class FormerRegion(models.TextChoices):
    """Quang Tri absorbed Quang Binh on 2025-07-01; keeping the former region lets us
    group villages the way local people still refer to them."""

    QUANG_TRI = "quang_tri", _("Former Quang Tri")
    QUANG_BINH = "quang_binh", _("Former Quang Binh")


class CraftVillage(PublishableModel):
    code = models.SlugField(
        _("code"),
        max_length=64,
        unique=True,
        help_text=_("Stable identifier used in URLs and data imports, e.g. tra-loc."),
    )
    name = models.CharField(_("name"), max_length=200)
    craft_type = models.CharField(
        _("craft type"), max_length=32, choices=CraftType.choices, db_index=True
    )
    main_products = models.CharField(_("main products"), max_length=255)

    recognition_status = models.CharField(
        _("recognition status"),
        max_length=32,
        choices=RecognitionStatus.choices,
        default=RecognitionStatus.UNKNOWN,
    )
    recognition_decision = models.CharField(_("recognition decision"), max_length=100, blank=True)
    recognition_year = models.PositiveSmallIntegerField(
        _("recognition year"), null=True, blank=True
    )

    former_region = models.CharField(
        _("former region"), max_length=16, choices=FormerRegion.choices, db_index=True
    )
    hamlet = models.CharField(_("hamlet"), max_length=100, blank=True)
    commune = models.CharField(
        _("commune"),
        max_length=100,
        blank=True,
        help_text=_("Current commune or ward, after the 2025-07-01 merger."),
    )
    former_commune = models.CharField(_("former commune"), max_length=100, blank=True)
    former_district = models.CharField(_("former district"), max_length=100, blank=True)
    latitude = models.DecimalField(
        _("latitude"), max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        _("longitude"), max_digits=9, decimal_places=6, null=True, blank=True
    )

    short_description = models.TextField(_("short description"), blank=True)
    history = models.TextField(_("history"), blank=True)
    production_process = models.TextField(_("production process"), blank=True)
    current_situation = models.TextField(_("current situation"), blank=True)
    culture = models.TextField(_("culture and festivals"), blank=True)
    visitor_info = models.TextField(_("visitor information"), blank=True)
    contact = models.CharField(_("contact"), max_length=255, blank=True)
    sources = models.TextField(
        _("sources"), blank=True, help_text=_("One reference per line: link, book or informant.")
    )
    notes = models.TextField(
        _("internal notes"), blank=True, help_text=_("Never shown on the public site.")
    )

    class Meta:
        verbose_name = _("craft village")
        verbose_name_plural = _("craft villages")
        ordering = ["name"]
        indexes = [models.Index(fields=["status", "craft_type"])]

    def __str__(self) -> str:
        return self.name

    @property
    def has_location(self) -> bool:
        """Only villages with coordinates can be placed on the map."""
        return self.latitude is not None and self.longitude is not None
