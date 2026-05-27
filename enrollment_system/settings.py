# enrollment_system/settings.py

from pathlib import Path
from datetime import timedelta
import os

# =====================================================
# BASE DIRECTORY
# =====================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# =====================================================
# SECURITY
# =====================================================
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-change-this-in-production'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'true').lower() == 'true'

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    '*'
).split(',')

# =====================================================
# APPLICATIONS
# =====================================================
INSTALLED_APPS = [

    # DJANGO
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # THIRD PARTY
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'corsheaders',
    'djoser',

    # LOCAL APPS
    'core.apps.CoreConfig',
]

# =====================================================
# MIDDLEWARE
# =====================================================
MIDDLEWARE = [

    # CORS
    'corsheaders.middleware.CorsMiddleware',

    # DJANGO
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# =====================================================
# ROOT URL
# =====================================================
ROOT_URLCONF = 'enrollment_system.urls'

# =====================================================
# TEMPLATES
# =====================================================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',

        'DIRS': [],

        'APP_DIRS': True,

        'OPTIONS': {

            'context_processors': [

                'django.template.context_processors.request',

                'django.contrib.auth.context_processors.auth',

                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# =====================================================
# WSGI
# =====================================================
WSGI_APPLICATION = 'enrollment_system.wsgi.application'

# =====================================================
# DATABASE
# =====================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'enrollment_db'),
        'USER': os.environ.get('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', '123'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

# =====================================================
# CUSTOM USER MODEL
# =====================================================
AUTH_USER_MODEL = 'core.User'

# =====================================================
# PASSWORD VALIDATORS
# =====================================================
AUTH_PASSWORD_VALIDATORS = [

    {
        'NAME':
        'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'
    },

    {
        'NAME':
        'django.contrib.auth.password_validation.MinimumLengthValidator'
    },

    {
        'NAME':
        'django.contrib.auth.password_validation.CommonPasswordValidator'
    },

    {
        'NAME':
        'django.contrib.auth.password_validation.NumericPasswordValidator'
    },
]

# =====================================================
# INTERNATIONALIZATION
# =====================================================
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# =====================================================
# STATIC FILES
# =====================================================
STATIC_URL = 'static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

# =====================================================
# MEDIA FILES
# =====================================================
MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'

# =====================================================
# DEFAULT PRIMARY KEY
# =====================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =====================================================
# CORS SETTINGS
# =====================================================
CORS_ALLOW_ALL_ORIGINS = os.environ.get(
    'CORS_ALLOW_ALL_ORIGINS',
    str(DEBUG)
).lower() == 'true'

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        ''
    ).split(',')
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True

# =====================================================
# REST FRAMEWORK
# =====================================================
REST_FRAMEWORK = {

    'DEFAULT_AUTHENTICATION_CLASSES': (

        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),

    'DEFAULT_PERMISSION_CLASSES': (

        'rest_framework.permissions.IsAuthenticated',
    ),

    'DEFAULT_PAGINATION_CLASS':
    'rest_framework.pagination.PageNumberPagination',

    'PAGE_SIZE': 10,

    'DEFAULT_RENDERER_CLASSES': (

        'rest_framework.renderers.JSONRenderer',

        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
}

# =====================================================
# SIMPLE JWT
# =====================================================
SIMPLE_JWT = {

    'ACCESS_TOKEN_LIFETIME':
    timedelta(hours=1),

    'REFRESH_TOKEN_LIFETIME':
    timedelta(days=7),

    'ROTATE_REFRESH_TOKENS':
    True,

    'BLACKLIST_AFTER_ROTATION':
    True,

    'AUTH_HEADER_TYPES':
    ('Bearer',),

    'USER_ID_FIELD':
    'id',

    'USER_ID_CLAIM':
    'user_id',
}

# =====================================================
# DJOSER
# =====================================================
DJOSER = {

    'LOGIN_FIELD': 'email',

    'USER_CREATE_PASSWORD_RETYPE': True,

    'SEND_ACTIVATION_EMAIL': False,
}

# =====================================================
# EMAIL BACKEND
# =====================================================
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'
)

EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true'
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    EMAIL_HOST_USER or 'noreply@student-enrollment.local'
)

# =====================================================
# FILE UPLOAD SETTINGS
# =====================================================

# MAX FILE SIZE
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760

# IMAGE FILE TYPES
FILE_UPLOAD_PERMISSIONS = 0o644

# =====================================================
# AUTO CREATE SUPERUSER (OPTIONAL)
# =====================================================
if os.environ.get("CREATE_SUPERUSER") == "true":

    try:

        from django.contrib.auth import get_user_model

        User = get_user_model()

        if not User.objects.filter(
            email="admin@test.com"
        ).exists():

            User.objects.create_superuser(
                email="admin@test.com",
                password="admin123"
            )

            print(
                "Superuser created successfully."
            )

    except Exception as e:

        print(
            f"Error creating superuser: {e}"
        )
