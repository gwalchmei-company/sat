import { sendNotification } from "infra/notifications";
import { eventDispatcher } from "infra/events/index.js";
import { activationUserTemplateEmail } from "infra/notifications/templates/email/activation-user";

eventDispatcher.on("USER_CREATED", async (event) => {
  const { user, activationToken } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: "Gwalchmei <contato@gwalchmei.com.br>",
      to: user.email,
      subject: "Ative seu cadastro!",
      text: activationUserTemplateEmail(user, activationToken),
    },
  });
});
