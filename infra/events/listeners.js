import { sendNotification } from "infra/notifications";
import { eventDispatcher } from "infra/events/index.js";
import {
  activationUserTemplateEmail,
  userActivatedTemplateEmail,
} from "infra/notifications/templates/email/activation-user";

const EMAIL_SENDER_DEFAULT = "Gwalchmei <contato@gwalchmei.com.br>";

eventDispatcher.on("USER_CREATED", async (event) => {
  const { user, activationToken } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: user.email,
      subject: "Ative seu cadastro!",
      text: activationUserTemplateEmail(user, activationToken),
    },
  });
});

eventDispatcher.on("USER_ACTIVATED", async (event) => {
  const { user } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: user.email,
      subject: "Cadastro ativado com sucesso!",
      text: userActivatedTemplateEmail(user),
    },
  });
});
