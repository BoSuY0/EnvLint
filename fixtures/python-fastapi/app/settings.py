import os
from pydantic_settings import BaseSettings

DATABASE_URL = os.environ["DATABASE_URL"]
CACHE_URL = os.getenv("CACHE_URL", "redis://localhost")

class Settings(BaseSettings):
    jwt_secret: str

