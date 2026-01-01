import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financial_expense from "models/financial-expenses";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:financialexpenses"), postHandler);
router.get(controller.canRequest("read:financialexpenses"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const financialExpenseInputValues = request.body;

  const financialExpenseCreated = await financial_expense.create(
    financialExpenseInputValues,
  );

  return response.status(201).json(financialExpenseCreated);
}

async function getHandler(request, response) {
  const financialExpenses = await financial_expense.listAll();

  return response.status(200).json(financialExpenses);
}
