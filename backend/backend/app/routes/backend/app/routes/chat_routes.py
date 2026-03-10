from fastapi import APIRouter
from app.models.schemas import ChatInput
from app.services.ai_service import ask_tax_question
from app.database import save_question

router = APIRouter(prefix="/chat")

@router.post("/ask")

def ask_chat(data: ChatInput):

    answer = ask_tax_question(data.question)

    save_question(data.user_id,data.question,answer)

    return {
        "question": data.question,
        "answer": answer
    }
