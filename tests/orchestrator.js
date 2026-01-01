import retry from "async-retry";
import { faker, fakerPT_BR } from "@faker-js/faker/";
import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session.js";
import { cpf } from "cpf-cnpj-validator";
import device from "models/device";
import financial_expense, {
  FINANCIAL_EXPENSE_CATEGORIES,
} from "models/financial-expenses";
import authorization from "models/authorization";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

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

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );
  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody;
  return lastEmailItem;
}

function extractUUID(text) {
  const match = text.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g,
  );
  return match ? match[0] : null;
}

async function createDevice(deviceObject) {
  return await device.create({
    email_acc: deviceObject?.email_acc || faker.internet.email(),
    utid_device: deviceObject?.utid_device || faker.database.mongodbObjectId(),
    serial_number:
      deviceObject?.serial_number || faker.database.mongodbObjectId(),
    serial_number_router:
      deviceObject?.serial_number_router || faker.database.mongodbObjectId(),
    model: deviceObject?.model || "Kit Standart",
    provider: deviceObject?.provider || "Starlink",
    tracker_code: deviceObject?.tracker_code || faker.location.zipCode(),
    status: deviceObject?.status || "available",
    notes: deviceObject?.notes || faker.lorem.text(),
  });
}

async function createFinancialExpense(financialExpenseObject) {
  return await financial_expense.create({
    description: financialExpenseObject?.description || faker.lorem.words(3),
    amount_in_cents:
      financialExpenseObject?.amount_in_cents ||
      faker.number.int({ min: 100, max: 10000 }),
    category:
      financialExpenseObject?.category ||
      faker.helpers.arrayElement(FINANCIAL_EXPENSE_CATEGORIES),
    paid_at: financialExpenseObject?.paid_at || null,
    due_date_at: financialExpenseObject?.due_date_at || null,
  });
}

async function createAuthenticatedUser(role = "customer", userObject) {
  const createdUser = await orchestrator.createUser(userObject);
  const activatedUser = await orchestrator.activateUser(createdUser);
  const sessionObject = await orchestrator.createSession(activatedUser.id);
  const userWithFeatures = await user.setFeatures(
    activatedUser.id,
    authorization.featuresRoles[`${role}`],
  );

  return {
    session: sessionObject,
    user: userWithFeatures,
  };
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  deleteAllEmails,
  getLastEmail,
  extractUUID,
  activateUser,
  cpf: {
    isValid: cpf.isValid,
    format: cpf.format,
    generate: cpf.generate,
  },
  createDevice,
  createFinancialExpense,
  createAuthenticatedUser,
};

export default orchestrator;
