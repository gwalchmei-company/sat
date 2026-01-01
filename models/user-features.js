// eslint-disable-next-line no-undef
const availableFeatures = new Set([
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",
  "read:user:others",

  // ACTIVATION_TOKEN
  "read:activation_token",

  // SESSION
  "create:session",
  "read:session",

  //DEVICES
  "create:devices",
  "read:devices",
  "update:devices",
  "update:devices:status",
  "delete:devices",

  // FINANCIAL EXPENSES
  "create:financialexpenses",
  "read:financialexpenses",
  "update:financialexpenses",
  "delete:financialexpenses",
]);

export default Object.freeze(availableFeatures);
