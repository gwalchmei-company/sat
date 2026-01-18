import { faker } from "@faker-js/faker/";
import rentalFinancials from "models/rental-financials";
import financial_expense, {
  FINANCIAL_EXPENSE_CATEGORIES,
} from "models/financial-expenses";
import rentalOrchestrator from "./rental.orchestrator.js";

async function createRentalFinancial(rentalFinancialObject, rentalObject) {
  let createdRental;
  if (!rentalFinancialObject?.rental_id) {
    createdRental = await rentalOrchestrator.createRental(rentalObject);
  }

  const createdRentalFinancial = await rentalFinancials.create({
    rental_id: rentalFinancialObject?.rental_id || createdRental.id,
    daily_price_in_cents:
      rentalFinancialObject?.daily_price_in_cents ||
      faker.number.int({ min: 5000, max: 20000 }),
    total_price_in_cents:
      rentalFinancialObject?.total_price_in_cents ||
      faker.number.int({ min: 30000, max: 100000 }),
    deposit_in_cents: rentalFinancialObject?.deposit_in_cents || 0,
    discount_in_cents: rentalFinancialObject?.discount_in_cents || 0,
    final_price_in_cents:
      rentalFinancialObject?.final_price_in_cents ||
      faker.number.int({ min: 30000, max: 100000 }),
  });

  return createdRentalFinancial;
}

async function createFinancialExpense(financialExpenseObject) {
  return await financial_expense.create({
    description: financialExpenseObject?.description || faker.lorem.words(3),
    amount_in_cents:
      financialExpenseObject?.amount_in_cents ||
      faker.number.int({ min: 100, max: 10000 }),
    category:
      financialExpenseObject?.category ||
      faker.helpers.arrayElement(FINANCIAL_EXPENSE_CATEGORIES),
    paid_at: financialExpenseObject?.paid_at || null,
    due_date_at: financialExpenseObject?.due_date_at || null,
  });
}

const orchestrator = {
  createRentalFinancial,
  createFinancialExpense,
};
export default orchestrator;
