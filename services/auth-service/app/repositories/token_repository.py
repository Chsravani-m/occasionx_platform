from app.db.models.refresh_token import RefreshToken


def save_refresh_token(
    db,
    user_id,
    token,
    expires_at
):
    refresh = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )

    db.add(refresh)
    db.commit()

    return refresh


def get_refresh_token(
    db,
    token
):
    return (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token
        )
        .first()
    )
def revoke_refresh_token(
    db,
    token
):
    refresh_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token
        )
        .first()
    )

    if refresh_token:
        refresh_token.revoked = True
        db.commit()

    return refresh_token

def revoke_refresh_token(
    db,
    token
):
    refresh_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token
        )
        .first()
    )

    if refresh_token:
        refresh_token.revoked = True
        db.commit()

    return refresh_token