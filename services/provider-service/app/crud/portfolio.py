from app.db.models.portfolio import Portfolio
import os
from app.schemas.portfolio import MediaType

def create_portfolio(
    db,
    provider_id,
    portfolio_data
):

    portfolio = Portfolio(
        provider_id=provider_id,
        **portfolio_data.model_dump()
    )

    db.add(portfolio)

    db.commit()

    db.refresh(portfolio)

    return portfolio


def get_provider_portfolios(
    db,
    provider_id
):
    return (
        db.query(Portfolio)
        .filter(
            Portfolio.provider_id
            == provider_id
        )
        .all()
    )


def delete_portfolio(
    db,
    portfolio_id
):
    portfolio = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == portfolio_id
        )
        .first()
    )

    if not portfolio:
        return False

    if portfolio.media_url:

        file_path = (
            portfolio.media_url
            .lstrip("/")
        )

        if os.path.exists(
            file_path
        ):
            os.remove(file_path)

    db.delete(portfolio)

    db.commit()

    return True

def get_provider_portfolio_summary(
    db,
    provider_id
):

    portfolios = (
        db.query(Portfolio)
        .filter(
            Portfolio.provider_id
            == provider_id
        )
        .all()
    )

    return {
        "images": len([
            p for p in portfolios
            if p.media_type == MediaType.IMAGE
        ]),
        "videos": len([
            p for p in portfolios
            if p.media_type == MediaType.VIDEO
        ]),
        "albums": len([
            p for p in portfolios
            if p.media_type == MediaType.ZIP
        ]),
        "items": portfolios
    }