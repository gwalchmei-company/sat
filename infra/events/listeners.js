import { sendNotification } from "infra/notifications";
import { eventDispatcher } from "infra/events/index.js";
import {
  activationUserTemplateEmail,
  userActivatedTemplateEmail,
} from "infra/notifications/templates/email/activation-user";
import {
  orderCreatedAdminTemplateEmail,
  orderCreatedCustomerTemplateEmail,
} from "infra/notifications/templates/email/rentals.templates";

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

eventDispatcher.on("ORDER_CREATED", async (event) => {
  const { order, createdBy } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: createdBy.email,
      subject: "Seu pedido foi criado com sucesso!",
      text: orderCreatedCustomerTemplateEmail(order, createdBy),
    },
  });

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: ["ryan@gwalchmei.com.br"],
      subject: `Novo pedido criado - ID ${order.id}`,
      text: orderCreatedAdminTemplateEmail(order, createdBy),
    },
  });
});
