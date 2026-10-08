from app.db.models.provider_document import (
    ProviderDocument
)

from app.db.models.provider import Provider

def upload_document(
    db,
    provider_id,
    document_data
):

    provider = (
        db.query(Provider)
        .filter(
            Provider.id == provider_id
        )
        .first()
    )

    if not provider:
        raise Exception(
            "Provider not found"
        )

    document = ProviderDocument(
        provider_id=provider_id,
        document_type=document_data[
            "document_type"
        ],
        document_url=document_data[
            "document_url"
        ]
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def get_documents(
    db,
    provider_id
):
    return (
        db.query(ProviderDocument)
        .filter(
            ProviderDocument.provider_id
            == provider_id
        )
        .all()
    )