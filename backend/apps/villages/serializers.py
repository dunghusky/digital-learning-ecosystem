from rest_framework import serializers

from .models import CraftVillage


class CraftVillageListSerializer(serializers.ModelSerializer):
    """Compact payload for list and map views."""

    class Meta:
        model = CraftVillage
        fields = [
            "code",
            "name",
            "craft_type",
            "main_products",
            "former_region",
            "commune",
            "latitude",
            "longitude",
            "short_description",
        ]


class CraftVillageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CraftVillage
        fields = [
            "code",
            "name",
            "craft_type",
            "main_products",
            "recognition_status",
            "recognition_decision",
            "recognition_year",
            "former_region",
            "hamlet",
            "commune",
            "former_commune",
            "former_district",
            "latitude",
            "longitude",
            "short_description",
            "history",
            "production_process",
            "current_situation",
            "culture",
            "visitor_info",
            "contact",
            "sources",
            "published_at",
            "updated_at",
        ]
