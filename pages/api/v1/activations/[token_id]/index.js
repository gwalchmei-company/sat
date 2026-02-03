import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation";
import { createEvent, eventDispatcher } from "infra/events";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.patch(controller.canRequest("read:activation_token"), patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const { token_id } = request.query;

  const validActivationToken = await activation.findOneValidById(token_id);
  const activatedUser = await activation.activatedUserByUserId(
    validActivationToken.user_id,
  );

  const usedActivationToken = await activation.markTokenAsUsed(token_id);

  await eventDispatcher.dispatch(
    createEvent({
      type: "USER_ACTIVATED",
      entity: "USER",
      entityId: validActivationToken.user_id,
      payload: {
        user: activatedUser,
      },
    }),
  );

  return response.status(200).json(usedActivationToken);
}
