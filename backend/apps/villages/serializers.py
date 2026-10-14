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


class CraftVillageFeatureSerializer(serializers.BaseSerializer):
    """One village as a GeoJSON Feature for the map.

    Villages without coordinates are kept with ``geometry: null`` (valid GeoJSON) so the map
    can still list them as "not yet located" from the same response.
    """

    PROPERTY_FIELDS = [
        "name",
        "craft_type",
        "former_region",
        "commune",
        "main_products",
        "short_description",
    ]

    def to_representation(self, village: CraftVillage) -> dict:
        geometry = None
        if village.has_location:
            # GeoJSON orders coordinates as [longitude, latitude], as plain numbers.
            geometry = {
                "type": "Point",
                "coordinates": [float(village.longitude), float(village.latitude)],
            }
        return {
            "type": "Feature",
            "id": village.code,
            "geometry": geometry,
            "properties": {field: getattr(village, field) for field in self.PROPERTY_FIELDS},
        }
