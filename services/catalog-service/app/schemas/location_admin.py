from pydantic import BaseModel


class CreateLocationRequest(BaseModel):
    district_id: int
    name: str


class UpdateLocationRequest(BaseModel):
    name: str