from rest_framework.routers import DefaultRouter

from .views import CraftVillageViewSet

router = DefaultRouter()
router.register("villages", CraftVillageViewSet, basename="village")

urlpatterns = router.urls
