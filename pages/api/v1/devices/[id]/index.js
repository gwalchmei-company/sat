import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import device from "models/device";
import authorization from "models/authorization";
import { ForbiddenError, ValidationError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:devices"), getHandler);
router.patch(controller.canRequest("update:devices"), patchHandler);
router.delete(controller.canRequest("delete:devices"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const deviceId = request.query.id;
  const deviceList = await device.findOneById(deviceId);

  return response.status(200).json(deviceList);
}

async function patchHandler(request, response) {
  const user = request.context.user;
  const deviceId = request.query.id;
  const insecureInput = request.body;

  if (!insecureInput || Object.keys(insecureInput).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado foi informado para atualizar este dispositivo.",
      action: "Forneça os dados que deseja atualizar e tente novamente.",
    });
  }

  const onlyStatusValue = authorization.filterInput(
    user,
    "update:devices:status",
    insecureInput,
  );

  if (Object.keys(onlyStatusValue).length > 0) {
    if (Object.keys(insecureInput).length > 1) {
      throw new ForbiddenError({
        message:
          "Você não possui permissão para atualizar os dados deste dispositivo.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
      });
    }
    const secureInputValues = {
      status: onlyStatusValue.status,
    };

    const deviceList = await device.update(deviceId, secureInputValues);

    return response.status(200).json(deviceList);
  }

  const secureInputValues = authorization.filterInput(
    user,
    "update:devices",
    insecureInput,
  );

  if (Object.keys(secureInputValues).length === 0) {
    throw new ForbiddenError({
      message:
        "Você não possui permissão para atualizar os dados deste dispositivo.",
      action: "Entre em contato com o suporte caso precise de ajuda.",
    });
  }

  const deviceList = await device.update(deviceId, secureInputValues);

  return response.status(200).json(deviceList);
}

async function deleteHandler(request, response) {
  const deviceId = request.query.id;

  await device.Delete(deviceId);

  return response.status(200).json({});
}
