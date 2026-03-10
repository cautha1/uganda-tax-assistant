def calculate_paye(salary):

    if salary <= 235000:
        tax = 0

    elif salary <= 335000:
        tax = (salary - 235000) * 0.1

    elif salary <= 410000:
        tax = 10000 + (salary - 335000) * 0.2

    else:
        tax = 25000 + (salary - 410000) * 0.3

    return round(tax,2)
