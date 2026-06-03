import sys
import os

# Ensure `app` package is importable when running pytest from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
