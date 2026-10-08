"""
One-off backfill: the account_activated column was added with
DEFAULT FALSE (see migrate_add_activation_fields.py), so every
provider who registered and paid the registration fee *before* the
email-activation feature existed got retroactively marked as
"not activated" - even though they were already fully verified and
using the platform, and never had an activation email sent to them.

This backfill grandfathers those providers in: any provider who has
already paid the registration fee, isn't activated yet, and was never
issued an activation token (activation_token IS NULL) predates the
feature and should be treated as activated. Providers who paid *after*
the feature shipped always get an activation_token generated before
their email goes out, so they're correctly left alone here and still
have to click the link.

Run this once:

    python -m app.migrate_backfill_activated_providers
"""

from sqlalchemy import text

from app.db.database import engine

STATEMENT = """
    UPDATE providers
    SET account_activated = TRUE,
        activated_at = COALESCE(activated_at, registration_paid_at, NOW())
    WHERE registration_fee_paid = TRUE
      AND account_activated = FALSE
      AND activation_token IS NULL
"""

print(
    "Running backfill: activating pre-existing paid providers "
    "that predate the email-activation feature..."
)

with engine.begin() as conn:
    result = conn.execute(text(STATEMENT))
    print(f"  Rows updated: {result.rowcount}")

print("Backfill complete.")
