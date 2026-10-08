"""
One-off backfill for bookings created before booking-service started
denormalizing customer_name/customer_email/customer_phone/provider_name/
service_name onto the Booking row at creation time.

Those older rows still have the real customer_id/provider_id/service_id
foreign keys - this script just looks the display names up from the
other services' databases (directly, not via HTTP) and fills them in.

Run once, from the booking-service folder, with the venv active:

    python -m app.scripts.backfill_booking_names

Safe to re-run: it only ever touches rows where the relevant field is
still NULL or empty, and never overwrites a name that's already set.
"""

from sqlalchemy import create_engine, text

BOOKING_DB_URL = (
    "postgresql+psycopg://postgres:postgres"
    "@localhost:5432/occasionx_booking_db"
)

PROVIDER_DB_URL = (
    "postgresql+psycopg://postgres:postgres"
    "@localhost:5432/occasionx_provider_db"
)

USER_DB_URL = (
    "postgresql+psycopg://postgres:postgres"
    "@localhost:5432/occasionx_user_db"
)


def backfill():
    booking_engine = create_engine(BOOKING_DB_URL)
    provider_engine = create_engine(PROVIDER_DB_URL)
    user_engine = create_engine(USER_DB_URL)

    with booking_engine.connect() as booking_conn:

        rows = booking_conn.execute(
            text(
                """
                SELECT id, customer_id, provider_id, service_id
                FROM bookings
                WHERE
                    service_name IS NULL OR service_name = ''
                    OR provider_name IS NULL OR provider_name = ''
                    OR customer_name IS NULL OR customer_name = ''
                """
            )
        ).fetchall()

        if not rows:
            print("Nothing to backfill - every booking already has names.")
            return

        provider_ids = {str(r.provider_id) for r in rows}
        service_ids = {str(r.service_id) for r in rows}
        customer_ids = {str(r.customer_id) for r in rows}

        with provider_engine.connect() as provider_conn:

            provider_names = {
                str(row.id): row.business_name
                for row in provider_conn.execute(
                    text(
                        "SELECT id, business_name FROM providers "
                        "WHERE id = ANY(:ids)"
                    ),
                    {"ids": list(provider_ids)},
                )
            }

            service_names = {
                str(row.id): row.name
                for row in provider_conn.execute(
                    text(
                        "SELECT id, name FROM provider_services "
                        "WHERE id = ANY(:ids)"
                    ),
                    {"ids": list(service_ids)},
                )
            }

        with user_engine.connect() as user_conn:

            customers = {
                str(row.user_id): row
                for row in user_conn.execute(
                    text(
                        "SELECT user_id, first_name, last_name, email, phone "
                        "FROM user_profiles WHERE user_id = ANY(:ids)"
                    ),
                    {"ids": list(customer_ids)},
                )
            }

        updated = 0
        skipped = 0

        for row in rows:
            provider_name = provider_names.get(str(row.provider_id))
            service_name = service_names.get(str(row.service_id))
            customer = customers.get(str(row.customer_id))

            customer_name = None
            customer_email = None
            customer_phone = None

            if customer:
                customer_name = (
                    f"{customer.first_name or ''} {customer.last_name or ''}"
                ).strip() or None
                customer_email = customer.email
                customer_phone = customer.phone

            if not any(
                [provider_name, service_name, customer_name]
            ):
                skipped += 1
                continue

            booking_conn.execute(
                text(
                    """
                    UPDATE bookings SET
                        provider_name = COALESCE(
                            NULLIF(provider_name, ''), :provider_name
                        ),
                        service_name = COALESCE(
                            NULLIF(service_name, ''), :service_name
                        ),
                        customer_name = COALESCE(
                            NULLIF(customer_name, ''), :customer_name
                        ),
                        customer_email = COALESCE(
                            NULLIF(customer_email, ''), :customer_email
                        ),
                        customer_phone = COALESCE(
                            NULLIF(customer_phone, ''), :customer_phone
                        )
                    WHERE id = :id
                    """
                ),
                {
                    "provider_name": provider_name,
                    "service_name": service_name,
                    "customer_name": customer_name,
                    "customer_email": customer_email,
                    "customer_phone": customer_phone,
                    "id": row.id,
                },
            )

            updated += 1

        booking_conn.commit()

        print(f"Backfilled {updated} booking(s).")

        if skipped:
            print(
                f"Skipped {skipped} booking(s) - couldn't find a matching "
                "provider/service/customer (likely since deleted)."
            )


if __name__ == "__main__":
    backfill()
