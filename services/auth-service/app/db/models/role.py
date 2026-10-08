
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    PROVIDER = "PROVIDER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"