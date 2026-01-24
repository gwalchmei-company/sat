import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financialIncome from "models/financial-income";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:financialincome"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const financialIncomeInputValues = request.body;

  const financialIncomeCreated = await financialIncome.create(
    financialIncomeInputValues,
  );

  return response.status(201).json(financialIncomeCreated);
}
