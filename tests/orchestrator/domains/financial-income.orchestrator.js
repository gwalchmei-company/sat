import { faker } from "@faker-js/faker/";
import financialIncome from "models/financial-income";
import rentalOrchestrator from "./rental.orchestrator.js";
import database from "infra/database.js";

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
    payment_method: financialIncomeObject?.payment_method || "PIX",
    received_at:
      financialIncomeObject?.received_at ||
      faker.date.recent({ days: 30 }).toISOString(),
    reference_date: financialIncomeObject?.reference_date || null,
    description: financialIncomeObject?.description || null,
    installment_number: financialIncomeObject?.installment_number || undefined,
    total_installments: financialIncomeObject?.total_installments || undefined,
    transaction_id: financialIncomeObject?.transaction_id || null,
    notes: financialIncomeObject?.notes || null,
  });

  if (financialIncomeObject?.deleted_at) {
    await database.query({
      text: `
      UPDATE 
        financial_income 
      SET 
        deleted_at = NOW() 
      WHERE id = $1
      ;`,
      values: [createdFinancialIncome.id],
    });
  }

  return createdFinancialIncome;
}

const orchestrator = {
  createFinancialIncome,
};

export default orchestrator;
