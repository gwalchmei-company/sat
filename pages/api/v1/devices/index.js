import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import device from "models/device";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:devices"), postHandler);
router.get(controller.canRequest("read:devices"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const deviceInputValues = request.body;
  const newDevice = await device.create(deviceInputValues);

  return response.status(201).json(newDevice);
}

async function getHandler(request, response) {
  const deviceList = await device.listAll();

  return response.status(200).json(deviceList);
}
