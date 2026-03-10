from pydantic import BaseModel

class SalaryInput(BaseModel):
    salary: float

class ChatInput(BaseModel):
    user_id: str
    question: str
