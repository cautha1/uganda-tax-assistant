/**
 * URA Penalty Calculations for Uganda Tax System
 * Based on Uganda Revenue Authority (URA) penalty structure
 */

export interface PenaltyCalculation {
  lateFilingPenalty: number;
  latePaymentPenalty: number;
  interestCharge: number;
  totalPenalty: number;
  minimumPenalty: number;
  details: string[];
}

export interface PenaltyInput {
  taxDue: number;
  dueDate: Date | string;
  currentDate?: Date;
  isPaid?: boolean;
  paidDate?: Date | string | null;
}

// URA Penalty Structure Constants
const LATE_FILING_RATE = 0.02; // 2% per month
const LATE_PAYMENT_RATE = 0.02; // 2% per month
const MAX_PENALTY_MONTHS = 24; // Maximum 24 months
const MINIMUM_PENALTY = 200000; // UGX 200,000 minimum
const ANNUAL_INTEREST_RATE = 0.25; // Bank of Uganda rate (~23%) + 2%

/**
 * Calculate the number of months between two dates
 */
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const months = 
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    (endDate.getDate() > startDate.getDate() ? 1 : 0);
  return Math.max(0, months);
}

/**
 * Calculate late filing penalty (2% per month, max 24 months)
 */
export function calculateLateFilingPenalty(taxDue: number, monthsLate: number): number {
  const cappedMonths = Math.min(monthsLate, MAX_PENALTY_MONTHS);
  return taxDue * LATE_FILING_RATE * cappedMonths;
}

/**
 * Calculate late payment penalty (2% per month, max 24 months)
 */
export function calculateLatePaymentPenalty(taxDue: number, monthsLate: number): number {
  const cappedMonths = Math.min(monthsLate, MAX_PENALTY_MONTHS);
  return taxDue * LATE_PAYMENT_RATE * cappedMonths;
}

/**
 * Calculate interest on unpaid tax (BoU rate + 2% per annum)
 */
export function calculateInterest(taxDue: number, daysLate: number): number {
  if (daysLate <= 0) return 0;
  const dailyRate = ANNUAL_INTEREST_RATE / 365;
  return taxDue * dailyRate * daysLate;
}

/**
 * Calculate total penalties and interest for a tax obligation
 */
export function calculateTotalPenalties(input: PenaltyInput): PenaltyCalculation {
  const { taxDue, dueDate, currentDate = new Date(), isPaid = false, paidDate } = input;
  
  const dueDateObj = new Date(dueDate);
  const currentDateObj = new Date(currentDate);
  const paidDateObj = paidDate ? new Date(paidDate) : null;
  
  const details: string[] = [];
  
  // Check if overdue
  const daysLate = Math.floor((currentDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLate <= 0) {
    return {
      lateFilingPenalty: 0,
      latePaymentPenalty: 0,
      interestCharge: 0,
      totalPenalty: 0,
      minimumPenalty: 0,
      details: ["No penalties - tax is not yet due"],
    };
  }
  
  const monthsLate = getMonthsDifference(dueDateObj, currentDateObj);
  
  // Calculate late filing penalty
  const lateFilingPenalty = calculateLateFilingPenalty(taxDue, monthsLate);
  details.push(`Late filing: 2% × ${Math.min(monthsLate, MAX_PENALTY_MONTHS)} months = UGX ${lateFilingPenalty.toLocaleString()}`);
  
  // Calculate late payment penalty (if not paid)
  let latePaymentPenalty = 0;
  if (!isPaid) {
    latePaymentPenalty = calculateLatePaymentPenalty(taxDue, monthsLate);
    details.push(`Late payment: 2% × ${Math.min(monthsLate, MAX_PENALTY_MONTHS)} months = UGX ${latePaymentPenalty.toLocaleString()}`);
  } else if (paidDateObj && paidDateObj > dueDateObj) {
    const paymentMonthsLate = getMonthsDifference(dueDateObj, paidDateObj);
    latePaymentPenalty = calculateLatePaymentPenalty(taxDue, paymentMonthsLate);
    details.push(`Late payment: 2% × ${Math.min(paymentMonthsLate, MAX_PENALTY_MONTHS)} months = UGX ${latePaymentPenalty.toLocaleString()}`);
  }
  
  // Calculate interest
  const interestDays = isPaid && paidDateObj 
    ? Math.floor((paidDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
    : daysLate;
  
  const interestCharge = calculateInterest(taxDue, Math.max(0, interestDays));
  if (interestCharge > 0) {
    details.push(`Interest: ${(ANNUAL_INTEREST_RATE * 100).toFixed(0)}% p.a. × ${interestDays} days = UGX ${interestCharge.toLocaleString()}`);
  }
  
  // Apply minimum penalty rule
  const calculatedTotal = lateFilingPenalty + latePaymentPenalty + interestCharge;
  const minimumApplied = taxDue > 0 && calculatedTotal < MINIMUM_PENALTY;
  const totalPenalty = minimumApplied ? Math.max(calculatedTotal, MINIMUM_PENALTY) : calculatedTotal;
  
  if (minimumApplied) {
    details.push(`Minimum penalty applied: UGX ${MINIMUM_PENALTY.toLocaleString()}`);
  }
  
  return {
    lateFilingPenalty,
    latePaymentPenalty,
    interestCharge,
    totalPenalty: Math.round(totalPenalty),
    minimumPenalty: minimumApplied ? MINIMUM_PENALTY : 0,
    details,
  };
}

/**
 * Format penalty breakdown for display
 */
export function formatPenaltyBreakdown(calculation: PenaltyCalculation): string {
  const lines = [
    `Late Filing Penalty: UGX ${calculation.lateFilingPenalty.toLocaleString()}`,
    `Late Payment Penalty: UGX ${calculation.latePaymentPenalty.toLocaleString()}`,
    `Interest Charge: UGX ${calculation.interestCharge.toLocaleString()}`,
    `---`,
    `Total Penalty: UGX ${calculation.totalPenalty.toLocaleString()}`,
  ];
  
  if (calculation.minimumPenalty > 0) {
    lines.push(`(Minimum penalty of UGX ${calculation.minimumPenalty.toLocaleString()} applied)`);
  }
  
  return lines.join("\n");
}

/**
 * Get risk level based on penalty exposure
 */
export function getPenaltyRiskLevel(totalPenalty: number, taxDue: number): "low" | "medium" | "high" {
  if (totalPenalty === 0) return "low";
  
  const penaltyRatio = taxDue > 0 ? totalPenalty / taxDue : 0;
  
  if (penaltyRatio > 0.2 || totalPenalty > 5000000) return "high"; // >20% or >5M UGX
  if (penaltyRatio > 0.1 || totalPenalty > 1000000) return "medium"; // >10% or >1M UGX
  return "low";
}
