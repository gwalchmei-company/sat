import { ForbiddenError, ValidationError } from "infra/errors";
import availableFeatures from "models/user-features";

export function can(user, feature, resource = null) {
  validateUser(user);
  validateFeature(feature);

  const [action, entity] = feature.split(":");

  if (!user.features.includes(feature)) {
    return false;
  }

  if (!resource) return true;

  const resourceOwnerId =
    resource.user_id ||
    resource.customer_id ||
    resource.owner_id ||
    resource.created_by ||
    resource.id;

  if (resourceOwnerId && user.id === resourceOwnerId) {
    return true;
  }

  const othersFeature = `${action}:${entity}:others`;

  if (user.features.includes(othersFeature)) {
    return true;
  }

  return false;
}

function filterInput(user, feature, input, target) {
  validateUser(user);
  validateFeature(feature);
  validateInput(input);

  let filteredInputValues = {};

  if (feature === "update:devices:status" && can(user, feature, target)) {
    const allowedFields = ["status"];
    const inputKeys = Object.keys(input);

    const hasInvalidField = inputKeys.some(
      (key) => !allowedFields.includes(key),
    );

    if (hasInvalidField) {
      throw new ForbiddenError({
        message:
          "Você não possui permissão para atualizar os dados deste dispositivo.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
      });
    }

    filteredInputValues = {
      status: input.status,
    };
  }

  if (feature === "update:devices" && can(user, feature, target)) {
    if (input.id) {
      throw new ValidationError({
        message: `Não é permitido atualizar o campo "id" do dispositivo.`,
        action: `Remova o campo "id" do input e tente novamente.`,
      });
    }
    if (input.created_at) {
      throw new ValidationError({
        message:
          'Não é permitido atualizar o campo "created_at" do dispositivo.',
        action: 'Remova o campo "created_at" do input e tente novamente.',
      });
    }

    if (input.updated_at) {
      throw new ValidationError({
        message:
          'Não é permitido atualizar o campo "updated_at" do dispositivo.',
        action: 'Remova o campo "updated_at" do input e tente novamente.',
      });
    }

    filteredInputValues = {
      email_acc: input?.email_acc,
      utid_device: input?.utid_device,
      serial_number: input?.serial_number,
      serial_number_router: input?.serial_number_router,
      model: input?.model,
      provider: input?.provider,
      tracker_code: input?.tracker_code,
      status: input?.status,
      notes: input?.notes,
    };
  }

  if (feature === "create:orders:status" && can(user, feature, target)) {
    filteredInputValues = {
      customer_id: input?.customer_id,
      start_date: input?.start_date,
      end_date: input?.end_date,
      notes: input?.notes,
      status: input?.status,
      location_refer: input?.location_refer,
      lat: input?.lat,
      lng: input?.lng,
    };
  }

  if (feature === "update:rentals" && can(user, feature, target)) {
    const allowedFields = [
      "device_id",
      "customer_id",
      "customer_order_id",
      "start_date",
      "end_date",
      "status",
      "notes",
      "location_refer",
      "lat",
      "lng",
    ];

    if (input.status && !can(user, "update:rentals:status")) {
      if (!can(user, "update:rentals")) {
        throw new ForbiddenError({
          message:
            "Você não possui permissão para atualizar o status do aluguel.",
          action:
            'Remova o campo "status" ou solicite a feature "update:rentals:status".',
        });
      }
    }

    filteredInputValues = {};
    for (const field of allowedFields) {
      if (field in input) {
        filteredInputValues[field] = input[field];
      }
    }
  }

  if (feature === "create:orders" && can(user, feature, target)) {
    if (typeof input.status !== "undefined") {
      const canSetStatus = can(user, "create:orders:status", target);

      if (!canSetStatus) {
        throw new ForbiddenError({
          message:
            "Você não possui permissão para definir o status deste pedido.",
          action:
            'Remova o campo "status" ou solicite a feature "create:orders:status".',
        });
      }
    }

    filteredInputValues = {
      customer_id: input?.customer_id,
      start_date: input?.start_date,
      end_date: input?.end_date,
      notes: input?.notes,
      location_refer: input?.location_refer,
      lat: input?.lat,
      lng: input?.lng,
    };

    if (
      typeof input.status !== "undefined" &&
      can(user, "create:orders:status", target)
    ) {
      filteredInputValues.status = input.status;
    }
  }

  if (feature === "update:orders:self" && can(user, feature, target)) {
    if (typeof input.status !== "undefined") {
      const canSetStatus = can(user, "update:orders:status", target);

      if (!canSetStatus) {
        const allowedFields = ["canceled"];
        if (
          allowedFields.includes(input.status) &&
          user.id === target.customer_id
        ) {
          return { status: input.status };
        }
        throw new ForbiddenError({
          message:
            "Você não possui permissão para definir o status deste pedido.",
          action:
            'Remova o campo "status", verifique a feature "update:orders:status" ou se o pedido lhe pertence.',
        });
      }
    }

    if (target.status !== "pending") {
      throw new ForbiddenError({
        message: "Você não tem mais permissão para atualizar este pedido.",
        action:
          "Somente pedidos em análise podem ser atualizados pelo cliente.",
      });
    }

    filteredInputValues = {
      start_date: input?.start_date,
      end_date: input?.end_date,
      notes: input?.notes,
      location_refer: input?.location_refer,
      lat: input?.lat,
      lng: input?.lng,
    };
  }

  if (feature === "update:orders:others" && can(user, feature, target)) {
    filteredInputValues = {
      start_date: input?.start_date,
      end_date: input?.end_date,
      notes: input?.notes,
      status: input?.status,
      location_refer: input?.location_refer,
      lat: input?.lat,
      lng: input?.lng,
    };
  }

  if (feature === "update:rentalfinancials" && can(user, feature, target)) {
    const denytedFields = ["rental_id", "id", "created_at", "deleted_at"];
    for (const field of denytedFields) {
      if (input[field] !== undefined) {
        throw new ValidationError({
          message: `O campo "${field}" não pode ser atualizado.`,
          action: `Remova o campo "${field}" e tente novamente.`,
        });
      }
    }

    filteredInputValues = {
      daily_price_in_cents: input?.daily_price_in_cents,
      total_price_in_cents: input?.total_price_in_cents,
      deposit_in_cents: input?.deposit_in_cents,
      discount_in_cents: input?.discount_in_cents,
      final_price_in_cents: input?.final_price_in_cents,
    };
  }

  if (feature === "update:financialincome" && can(user, feature, target)) {
    const denytedFields = ["rental_id", "id", "created_at", "deleted_at"];
    for (const field of denytedFields) {
      if (input[field] !== undefined) {
        throw new ValidationError({
          message: `O campo "${field}" não pode ser atualizado.`,
          action: `Remova o campo "${field}" e tente novamente.`,
        });
      }
    }

    filteredInputValues = {
      amount_in_cents: input?.amount_in_cents,
      payment_method: input?.payment_method,
      received_at: input?.received_at,
      reference_date: input?.reference_date,
      description: input?.description,
      installment_number: input?.installment_number,
      total_installments: input?.total_installments,
      transaction_id: input?.transaction_id,
      notes: input?.notes,
    };
  }

  // Remove undefined values
  const cleanedInput = {};
  for (const key in filteredInputValues) {
    if (filteredInputValues[key] !== undefined) {
      cleanedInput[key] = filteredInputValues[key];
    }
  }

  return cleanedInput;
}

function validateInput(input) {
  let countInputFields = 0;
  for (const key in input) {
    if (input[key] !== undefined) countInputFields++;
  }

  if (!input || countInputFields === 0) {
    throw new ValidationError({
      message: `Nenhum "input" foi especificado para a ação de filtro.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }
}

function validateUser(user) {
  if (!user) {
    throw new ValidationError({
      message: `Nenhum "user" foi especificado para a ação de autorização.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }

  if (!user.features || !Array.isArray(user.features)) {
    throw new ValidationError({
      message: `"user" não possui "features" ou não é um array.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }
}

function validateFeature(feature) {
  if (!feature) {
    throw new ValidationError({
      message: `Nenhuma "feature" foi especificada para a ação de autorização.`,
      action: `Contate o suporte informando o campo "errorId".`,
    });
  }

  if (!availableFeatures.has(feature)) {
    throw new ValidationError({
      message: `A feature utilizada não está disponível na lista de features existentes.`,
      action: `Contate o suporte informando o campo "errorId".`,
      context: {
        feature: feature,
      },
    });
  }
}

const DefaultUserFeatures = ["create:session", "read:session"];

const featuresRoles = {
  anonymous: ["read:activation_token", "create:session", "create:user"],
  customer: [
    ...DefaultUserFeatures,
    "read:user",
    "read:user:self",
    "update:user",
    "update:user:self",

    "create:orders",
    "read:orders:self",
    "update:orders",
    "update:orders:self",

    "read:rentals",
    "read:rentals:self",

    "read:rentalfinancials",
    "read:rentalfinancials:self",

    "read:rentalfiles",
    "read:rentalfiles:self",

    "read:contracts",
    "read:contracts:self",
    "sign:contracts",
    "sign:contracts:self",
    "cancel:contracts",
    "cancel:contracts:self",

    "read:financialincome",
    "read:financialincome:self",
  ],
  admin: [
    ...DefaultUserFeatures,
    "create:user",
    "read:devices",
    "read:rentals:devices",
    "update:devices",
    "delete:devices",

    "read:user",
    "read:user:self",
    "read:user:others",
    "update:user",
    "update:user:self",
    "update:user:others",

    "create:financialexpenses",
    "read:financialexpenses",
    "update:financialexpenses",
    "delete:financialexpenses",

    "create:orders",
    "create:orders:status",
    "create:orders:others",

    "read:orders",
    "update:orders",
    "update:orders:others",
    "delete:orders",
    "delete:orders:completed",

    "create:rentals",
    "read:rentals",
    "read:rentals:others",
    "update:rentals",
    "update:rentals:others",
    "delete:rentals",

    "create:rentalfinancials",
    "read:rentalfinancials",
    "read:rentalfinancials:others",
    "update:rentalfinancials",
    "delete:rentalfinancials",

    "create:rentalfiles",
    "read:rentalfiles",
    "read:rentalfiles:others",
    "delete:rentalfiles",

    "create:contracts",
    "read:contracts",
    "read:contracts:others",
    "update:contracts",
    "delete:contracts",
    "sign:contracts",
    "sign:contracts:others",
    "cancel:contracts",
    "cancel:contracts:others",

    "create:financialincome",
    "read:financialincome",
    "read:financialincome:others",
    "update:financialincome",
    "delete:financialincome",
  ],
  manager: [
    ...DefaultUserFeatures,
    "create:user",
    "read:devices",
    "update:devices",

    "read:user",
    "read:user:self",
    "read:user:others",
    "update:user",
    "update:user:self",
    "update:user:others",
    "update:devices",

    "read:financialexpenses",

    "read:orders",
    "update:orders",
    "update:orders:others",
    "delete:orders",

    "create:rentals",
    "read:rentals",
    "read:rentals:others",
    "update:rentals",
    "update:rentals:others",

    "create:rentalfinancials",
    "read:rentalfinancials",
    "read:rentalfinancials:others",
    "update:rentalfinancials",
    "delete:rentalfinancials",

    "create:rentalfiles",
    "read:rentalfiles",
    "read:rentalfiles:others",
    "delete:rentalfiles",

    "create:contracts",
    "read:contracts",
    "read:contracts:others",
    "update:contracts",
    "delete:contracts",
    "sign:contracts",
    "sign:contracts:others",
    "cancel:contracts",
    "cancel:contracts:others",

    "create:financialincome",
    "read:financialincome",
    "read:financialincome:others",
    "update:financialincome",
  ],
  operator: [
    ...DefaultUserFeatures,
    "read:devices",
    "update:devices",
    "update:devices:status",

    "read:user",
    "read:user:self",
    "read:user:others",

    "read:rentals",
    "read:rentals:others",
    "update:rentals",
    "update:rentals:status",

    "create:rentalfiles",
    "read:rentalfiles",
    "read:rentalfiles:others",
    "delete:rentalfiles",

    "read:contracts",
    "read:contracts:others",

    "read:financialincome",
    "read:financialincome:others",
  ],
  support: [
    ...DefaultUserFeatures,
    "read:devices",
    "read:user",
    "read:user:self",
    "read:user:others",
    "read:orders",

    "read:rentals",
    "read:rentals:others",

    "create:rentalfiles",
    "read:rentalfiles",
    "read:rentalfiles:others",
    "delete:rentalfiles",

    "read:contracts",
    "read:contracts:others",

    "read:financialincome",
    "read:financialincome:others",
  ],
};

const authorization = {
  can,
  featuresRoles,
  filterInput,
};

export default authorization;
