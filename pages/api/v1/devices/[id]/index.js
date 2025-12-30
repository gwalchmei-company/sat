import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import device from "models/device";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:devices"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const deviceId = request.query.id;
  const deviceList = await device.findOneById(deviceId);

  return response.status(200).json(deviceList);
}
