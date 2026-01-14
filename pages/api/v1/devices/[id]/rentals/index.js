import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:rentals"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const deviceId = request.query.id;

  if (!authorization.can(userLogged, "read:rentals:others")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:rentals:others" para listar os aluguéis de dispositivos.',
    });
  }

  const rentalsList = await rental.listByDeviceId(deviceId);
  return response.status(200).json(rentalsList);
}
