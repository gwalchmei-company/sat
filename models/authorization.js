function can(user, feature) {
  let authorized = false;

  if (user.features.includes(feature)) {
    authorized = true;
  }
  return authorized;
}

const featuresRoles = {
  anonymous: ["read:activation_token", "create:session", "create:user"],
  customer: [],
  admin: ["read:devices"],
  manager: ["read:devices"],
  operator: ["read:devices"],
  support: ["read:devices"],
};

const authorization = {
  can,
  featuresRoles,
};

export default authorization;
