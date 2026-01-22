import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import contract from "models/contract";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:contracts"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const contractInputValues = request.body;

  const contractCreated = await contract.create(contractInputValues);
  return response.status(201).json(contractCreated);
}
