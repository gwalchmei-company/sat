import { ValidationError } from "infra/errors";
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
  customer: [...DefaultUserFeatures, "read:user", "read:user:self"],
  admin: [
    ...DefaultUserFeatures,
    "create:user",
    "read:devices",
    "read:user",
    "read:user:self",
    "read:user:others",
  ],
  manager: [
    ...DefaultUserFeatures,
    "create:user",
    "read:devices",
    "read:user",
    "read:user:self",
    "read:user:others",
  ],
  operator: [
    ...DefaultUserFeatures,
    "read:devices",
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
};

export default authorization;
