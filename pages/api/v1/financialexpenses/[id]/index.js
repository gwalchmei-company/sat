import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financial_expense from "models/financial-expenses";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:financialexpenses"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const financialExpenseId = request.query.id;
  const financialExpenseList =
    await financial_expense.findOneById(financialExpenseId);

  return response.status(200).json(financialExpenseList);
}
