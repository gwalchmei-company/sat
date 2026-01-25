import { sendNotification } from "infra/notifications";
import { eventDispatcher } from "infra/events/index.js";
import {
  activationUserTemplateEmail,
  userActivatedTemplateEmail,
} from "infra/notifications/templates/email/activation-user";
import {
  contractCreatedCustomerTemplateEmail,
  orderApprovedAdminTemplateEmail,
  orderApprovedCustomerTemplateEmail,
  orderCreatedAdminTemplateEmail,
  orderCreatedCustomerTemplateEmail,
  orderStatusChangedCustomerTemplateEmail,
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

eventDispatcher.on("ORDER_APPROVED", async (event) => {
  const { order, rental, customer, approved_by } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: customer.email,
      subject: "Seu pedido foi processado e está em análise!",
      text: orderApprovedCustomerTemplateEmail(rental, customer),
    },
  });

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: ["ryan@gwalchmei.com.br"],
      subject: `Uma Ordem de Serviço foi aprovada`,
      text: orderApprovedAdminTemplateEmail(
        approved_by,
        order,
        rental,
        customer,
      ),
    },
  });
});

eventDispatcher.on("ORDER_STATUS_CHANGED", async (event) => {
  const { newStatus, order, customer } = event.payload;

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: [customer.email],
      subject: "Atualização do status do seu pedido",
      text: orderStatusChangedCustomerTemplateEmail(newStatus, order, customer),
    },
  });
});

eventDispatcher.on("CONTRACT_CREATED", async (event) => {
  const { customer } = event.payload;
  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: customer.email,
      subject: "Contrato criado com sucesso!",
      text: contractCreatedCustomerTemplateEmail(customer),
    },
  });
});
