from google.cloud import firestore

db = firestore.Client()

def save_question(user_id, question, answer):

    data = {
        "user_id": user_id,
        "question": question,
        "answer": answer
    }

    db.collection("questions").add(data)
