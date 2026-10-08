import json

from app.db.models.service import Service


# attributes is a dict on the Pydantic schema but a JSON-encoded Text
# column on the model (this codebase's existing convention for
# list/dict fields - see crud/provider.py's _JSON_LIST_FIELDS), so it
# needs encoding before either INSERT or UPDATE.
_JSON_DICT_FIELDS = {"attributes"}


def _encode_json_fields(data: dict) -> dict:
    encoded = dict(data)

    for key in _JSON_DICT_FIELDS:
        if key in encoded and encoded[key] is not None:
            encoded[key] = json.dumps(encoded[key])

    return encoded


def create_service(
    db,
    provider_id,
    service_data
):

    service = Service(
        provider_id=provider_id,
        **_encode_json_fields(
            service_data.model_dump()
        )
    )

    db.add(service)

    db.commit()

    db.refresh(service)

    return service


def get_provider_services(
    db,
    provider_id
):
    return (
        db.query(Service)
        .filter(
            Service.provider_id
            == provider_id
        )
        .all()
    )


def get_service(
    db,
    service_id
):
    return (
        db.query(Service)
        .filter(
            Service.id == service_id
        )
        .first()
    )


def update_service(
    db,
    service_id,
    service_data
):
    service = get_service(
        db,
        service_id
    )

    if not service:
        return None

    updates = _encode_json_fields(
        service_data.model_dump(
            exclude_unset=True
        )
    )

    for field, value in updates.items():
        setattr(
            service,
            field,
            value
        )

    db.commit()

    db.refresh(service)

    return service


def delete_service(
    db,
    service_id
):
    service = get_service(
        db,
        service_id
    )

    if not service:
        return False

    db.delete(service)

    db.commit()

    return True