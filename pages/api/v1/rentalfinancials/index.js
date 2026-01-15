import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFinancials from "models/rental-financials";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentalfinancials"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const rentalFinancialInputValues = request.body;
  const rentalFinancialCreated = await rentalFinancials.create(
    rentalFinancialInputValues,
  );
  return response.status(201).json(rentalFinancialCreated);
}
