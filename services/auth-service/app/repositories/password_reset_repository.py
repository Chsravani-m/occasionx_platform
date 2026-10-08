from app.db.models.password_reset import (
    PasswordResetToken
)


def save_reset_token(
    db,
    user_id,
    token,
    expires_at
):
    reset = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )

    db.add(reset)
    db.commit()
    db.refresh(reset)

    return reset


def get_reset_token(
    db,
    token
):
    return (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == token
        )
        .first()
    )