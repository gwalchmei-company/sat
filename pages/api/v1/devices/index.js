import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import device from "models/device";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:devices"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const deviceInputValues = request.body;
  const newDevice = await device.create(deviceInputValues);

  return response.status(201).json(newDevice);
}
