from app.core.service_auth import current_user

# Kept under its old name for existing imports; token validation (and
# rejection of refresh / onboarding tokens) lives in service_auth.
get_current_user = current_user
