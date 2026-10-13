from app.core.service_auth import current_user, ensure_self_or_admin

# Kept under their old names for existing imports; token validation
# (and rejection of refresh / onboarding tokens) lives in service_auth.
get_current_user = current_user


def require_self_or_admin(
    resource_owner_id,
    current_user: dict
):
    """
    Raises 403 unless the logged-in user IS the resource owner (their
    token 'sub' matches resource_owner_id) or is an admin. Use for any
    endpoint scoped by a customer_id/user_id path param.
    """
    ensure_self_or_admin(current_user, resource_owner_id)
