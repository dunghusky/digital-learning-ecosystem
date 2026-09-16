from .base import *  # noqa: F403

DEBUG = True

# In development, serve static files straight from the apps; no collectstatic needed.
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
