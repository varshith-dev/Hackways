import os

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    NATS_URL: str = os.getenv("NATS_URL", "nats://localhost:4222")
    VALKEY_ADDR: str = os.getenv("VALKEY_ADDR", "localhost:6379")
    GRPC_TARGET: str = os.getenv("GRPC_TARGET", "localhost:50051")
    STREAM_NAME: str = "EVENTFLOW"
    CONSUMER_GROUP: str = "insights-orchestration"
    FLASH_CROWD_THRESHOLD: int = int(os.getenv("FLASH_CROWD_THRESHOLD", "50")) # RSVPs per minute

settings = Settings()
