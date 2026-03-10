from fastapi import APIRouter
from app.models.schemas import SalaryInput
from app.services.tax_service import calculate_paye

router = APIRouter(prefix="/tax")

@router.post("/paye")

def paye(data: SalaryInput):

    tax = calculate_paye(data.salary)

    return {
        "salary": data.salary,
        "tax": tax
    }
