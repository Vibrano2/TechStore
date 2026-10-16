"""
cPanel Phusion Passenger WSGI entrypoint for TechStore Backend.
Placed in the application root directory for cPanel "Setup Python App".
"""

import sys
import os

# Enforce UTF-8 locale and I/O encoding in cPanel Phusion Passenger environment
os.environ['LC_ALL'] = 'en_US.UTF-8'
os.environ['LANG'] = 'en_US.UTF-8'
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Add the project root to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Load .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(SCRIPT_DIR, '.env'))
except Exception:
    pass

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'techstore_backend.settings')

# Import Django WSGI handler
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
