import vertexai
from vertexai.generative_models import GenerativeModel
from app.config import PROJECT_ID, REGION

vertexai.init(project=PROJECT_ID, location=REGION)

model = GenerativeModel("gemini-1.5-flash")

def ask_tax_question(question):

    prompt = f"""
You are a Uganda tax expert.
Answer based on Uganda Revenue Authority rules.

Question: {question}
"""

    response = model.generate_content(prompt)

    return response.text
