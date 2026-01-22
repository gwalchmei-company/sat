import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFiles from "models/rental-file";
import rental from "models/rental";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentalfiles"), postHandler);
router.get(controller.canRequest("read:rentalfiles"), getHandler);

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

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const { id: rentalId } = request.query;

  const canReadAll = authorization.can(userLogged, "read:rentalfiles:others");
  const canReadOwn = authorization.can(userLogged, "read:rentalfiles:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:rentalfiles:others" ou "read:rentalfiles:self".',
    });
  }

  const rentalFound = await rental.findOneById(rentalId);

  if (!canReadAll && rentalFound.customer_id !== userLogged.id) {
    throw new ForbiddenError({
      message: "Você não possui permissão para visualizar esses arquivos.",
      action: "Você só pode visualizar arquivos dos seus próprios aluguéis.",
    });
  }

  const filesList = await rentalFiles.findAllByRentalId(rentalId);
  return response.status(200).json(filesList);
}
