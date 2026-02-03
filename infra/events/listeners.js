import { sendNotification } from "infra/notifications";
import { eventDispatcher } from "infra/events/index.js";
import {
  activationUserTemplateEmail,
  userActivatedTemplateEmail,
} from "infra/notifications/templates/email/activation-user";
import {
  contractCanceledAdminTemplateEmail,
  contractCanceledCustomerTemplateEmail,
  contractCreatedCustomerTemplateEmail,
  contractSentCustomerTemplateEmail,
  contractSignedAdminTemplateEmail,
  contractSignedCustomerTemplateEmail,
  financialIncomeCreatedTemplateEmailToAdmin,
  financialIncomeCreatedTemplateEmailToCustomer,
  orderApprovedAdminTemplateEmail,
  orderApprovedCustomerTemplateEmail,
  orderCreatedAdminTemplateEmail,
  orderCreatedCustomerTemplateEmail,
  orderStatusChangedCustomerTemplateEmail,
  rentalUpdatedAdminTemplateEmail,
  rentalUpdatedCustomerTemplateEmail,
} from "infra/notifications/templates/email/rentals.templates";
import user from "models/user";
import rental from "models/rental";

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

eventDispatcher.on("CONTRACT_UPDATED", async (event) => {
  const { contract } = event.payload;

  const rentalObject = await rental.findOneById(contract.rental_id);
  const customer = await user.findOneById(rentalObject.customer_id);
  if (contract.status == "sent") {
    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: customer.email,
        subject: "Contrato disponível para assinatura!",
        text: contractSentCustomerTemplateEmail(customer),
      },
    });
  }
});

eventDispatcher.on("CONTRACT_SIGNED", async (event) => {
  const { signedContract } = event.payload;
  console.log(signedContract);

  const rentalObject = await rental.findOneById(signedContract.rental_id);
  const customer = await user.findOneById(rentalObject.customer_id);

  if (signedContract.status == "signed") {
    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: customer.email,
        subject: "Contrato assinado com sucesso!",
        text: contractSignedCustomerTemplateEmail(
          customer,
          rentalObject,
          signedContract,
        ),
      },
    });

    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: ["ryan@gwalchmei.com.br"],
        subject: "Um contrato foi assinado!",
        text: contractSignedAdminTemplateEmail(
          customer,
          rentalObject,
          signedContract,
        ),
      },
    });
  }
});

eventDispatcher.on("CONTRACT_CANCELED", async (event) => {
  const { canceledContract, canceledBy } = event.payload;

  const rentalObject = await rental.findOneById(canceledContract.rental_id);
  const customer = await user.findOneById(rentalObject.customer_id);

  if (canceledContract.status == "canceled") {
    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: customer.email,
        subject: "Seu contrato foi cancelado!",
        text: contractCanceledCustomerTemplateEmail(customer, canceledContract),
      },
    });

    if (customer.username === canceledBy.username) {
      sendNotification({
        channel: "EMAIL",
        params: {
          from: EMAIL_SENDER_DEFAULT,
          to: ["ryan@gwalchmei.com.br"],
          subject: `Um cliente cancelou um contrato!`,
          text: contractCanceledAdminTemplateEmail(customer, canceledContract),
        },
      });
    }
  }
});

eventDispatcher.on("FINANCIALINCOME_CREATED", async (event) => {
  const { financialIncome, performedBy } = event.payload;

  const rentalObject = await rental.findOneById(financialIncome.rental_id);
  const customer = await user.findOneById(rentalObject.customer_id);

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: [customer.email],
      subject: "Pagamento recebido com sucesso!",
      text: financialIncomeCreatedTemplateEmailToCustomer(
        financialIncome,
        customer,
      ),
    },
  });

  sendNotification({
    channel: "EMAIL",
    params: {
      from: EMAIL_SENDER_DEFAULT,
      to: ["ryan@gwalchmei.com.br"],
      subject: "Pagamento recebido",
      text: financialIncomeCreatedTemplateEmailToAdmin(
        customer,
        financialIncome,
        performedBy,
      ),
    },
  });
});

eventDispatcher.on("RENTAL_UPDATED", async (event) => {
  const { changes, updatedBy } = event.payload;
  const rentalUpdated = await rental.findOneById(event.entityId);
  const customer = await user.findOneById(rentalUpdated.customer_id);

  if (changes.status && changes.status === "active") {
    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: customer.email,
        subject: "Seu aluguel foi iniciado!",
        text: rentalUpdatedCustomerTemplateEmail(
          rentalUpdated,
          changes,
          customer,
        ),
      },
    });

    sendNotification({
      channel: "EMAIL",
      params: {
        from: EMAIL_SENDER_DEFAULT,
        to: ["ryan@gwalchmei.com.br"],
        subject: "Um aluguel foi iniciado!",
        text: rentalUpdatedAdminTemplateEmail(
          rentalUpdated,
          changes,
          customer,
          updatedBy,
        ),
      },
    });
  }
});
