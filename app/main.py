import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, rooms, users, websocket
from app.services.pubsub import listen_and_forward


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the Redis pub/sub listener once per process - this is what forwards
    # messages published by OTHER instances to the sockets this instance holds.
    listener_task = asyncio.create_task(listen_and_forward())
    yield
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Realtime Chat API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(users.router)
app.include_router(websocket.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
