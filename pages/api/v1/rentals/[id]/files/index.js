import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFiles from "models/rental-file";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentalfiles"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userLogged = request.context.user;
  const { id: rentalId } = request.query;

  const fileInputValues = {
    ...request.body,
    rental_id: rentalId,
    uploaded_by: userLogged.id,
  };

  const fileCreated = await rentalFiles.create(fileInputValues);
  return response.status(201).json(fileCreated);
}
