from fastapi import FastAPI
from app.routes import tax_routes, chat_routes

app = FastAPI(title="Uganda Tax Assistant")

app.include_router(tax_routes.router)
app.include_router(chat_routes.router)

@app.get("/")
def home():
    return {"status":"API running"}
