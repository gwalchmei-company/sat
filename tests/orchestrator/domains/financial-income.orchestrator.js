import { faker } from "@faker-js/faker/";
import financialIncome, { PAYMENT_METHODS } from "models/financial-income";
import rentalOrchestrator from "./rental.orchestrator.js";

async function createFinancialIncome(financialIncomeObject, rentalObject) {
  let createdRental;
  if (!financialIncomeObject?.rental_id) {
    createdRental = await rentalOrchestrator.createRental(rentalObject);
  }

  const createdFinancialIncome = await financialIncome.create({
    rental_id: financialIncomeObject?.rental_id || createdRental.id,
    amount_in_cents:
      financialIncomeObject?.amount_in_cents ||
      faker.number.int({ min: 5000, max: 50000 }),
    payment_method:
      financialIncomeObject?.payment_method ||
      faker.helpers.arrayElement(PAYMENT_METHODS),
    received_at:
      financialIncomeObject?.received_at ||
      faker.date.recent({ days: 30 }).toISOString(),
    reference_date: financialIncomeObject?.reference_date || null,
    description: financialIncomeObject?.description || null,
    installment_number: financialIncomeObject?.installment_number || null,
    total_installments: financialIncomeObject?.total_installments || null,
    transaction_id: financialIncomeObject?.transaction_id || null,
    notes: financialIncomeObject?.notes || null,
  });

  return createdFinancialIncome;
}

const orchestrator = {
  createFinancialIncome,
};

export default orchestrator;
