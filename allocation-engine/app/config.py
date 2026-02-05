from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_username: str = "postgres"
    db_password: str = "postgres"
    db_database: str = "hostel_allocation"

    # Core Services
    core_services_url: str = "http://localhost:3000"

    # Server
    allocation_port: int = 8000

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_username}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_database}"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
