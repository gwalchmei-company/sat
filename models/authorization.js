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
    resource.user_id || resource.owner_id || resource.created_by || resource.id;

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

  // Force the clean up of "undefined" values
  return JSON.parse(JSON.stringify(filteredInputValues));
}

function validateInput(input) {
  if (!input) {
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
  ],
  admin: [
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
  ],
  operator: [
    ...DefaultUserFeatures,
    "read:devices",
    "update:devices",
    "update:devices:status",

    "read:user",
    "read:user:self",
    "read:user:others",
  ],
  support: [
    ...DefaultUserFeatures,
    "read:devices",
    "read:user",
    "read:user:self",
    "read:user:others",
  ],
};

const authorization = {
  can,
  featuresRoles,
  filterInput,
};

export default authorization;
