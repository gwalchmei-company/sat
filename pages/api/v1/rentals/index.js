import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentals"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const rentalInputValues = request.body;
  const rentalCreated = await rental.create(rentalInputValues);
  return response.status(201).json(rentalCreated);
}
