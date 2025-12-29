function can(user, feature) {
  let authorized = false;

  if (user.features.includes(feature)) {
    authorized = true;
  }
  return authorized;
}

const DefaultUserFeatures = ["create:session", "read:session"];

const featuresRoles = {
  anonymous: ["read:activation_token", "create:session", "create:user"],
  customer: [...DefaultUserFeatures],
  admin: [...DefaultUserFeatures, "create:user", "read:devices"],
  manager: [...DefaultUserFeatures, "create:user", "read:devices"],
  operator: [...DefaultUserFeatures, "read:devices"],
  support: [...DefaultUserFeatures, "read:devices"],
};

const authorization = {
  can,
  featuresRoles,
};

export default authorization;
