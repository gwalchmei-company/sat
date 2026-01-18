import { faker, fakerPT_BR } from "@faker-js/faker/";
import user from "models/user.js";
import session from "models/session.js";
import authorization from "models/authorization";
import { cpf } from "cpf-cnpj-validator";

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
    cpf: userObject?.cpf || cpf.generate(false),
    phone:
      userObject?.phone ||
      fakerPT_BR.phone.number({
        style: "national",
      }),
    address: userObject?.address || faker.location.streetAddress(),
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function activateUser(inactiveUser) {
  return await user.setFeatures(inactiveUser.id, [
    "create:session",
    "read:session",
  ]);
}

async function createAuthenticatedUser(role = "customer", userObject) {
  const createdUser = await createUser(userObject);
  const activatedUser = await activateUser(createdUser);
  const sessionObject = await createSession(activatedUser.id);
  const userWithFeatures = await user.setFeatures(
    activatedUser.id,
    authorization.featuresRoles[`${role}`],
  );

  return {
    session: sessionObject,
    user: userWithFeatures,
  };
}

async function addFeaturesToUser(userId, features) {
  return await user.addFeatures(userId, features);
}

const orchestrator = {
  createUser,
  createSession,
  activateUser,
  createAuthenticatedUser,
  addFeaturesToUser,
};

export default orchestrator;
