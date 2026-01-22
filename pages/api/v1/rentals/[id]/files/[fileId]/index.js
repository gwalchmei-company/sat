import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFiles from "models/rental-file";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.delete(controller.canRequest("delete:rentalfiles"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function deleteHandler(request, response) {
  const userLogged = request.context.user;
  const { fileId } = request.query;

  await rentalFiles.deleteById(fileId, userLogged.id);
  return response
    .status(200)
    .json({ message: "Arquivo deletado com sucesso." });
}
