import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import authorization from "models/authorization";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/financialexpenses", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create financial expense when user is admin", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        description: financialExpenseInput.description,
        amount_in_cents: financialExpenseInput.amount_in_cents,
        category: financialExpenseInput.category,
        paid_at: financialExpenseInput.paid_at,
        due_date_at: financialExpenseInput.due_date_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("fail when description is missing", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 1000,
            category: "utilities",
            paid_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Descrição não foi informada.",
        action: "Insira uma descrição válida para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when amount_in_cents is negative", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: "Conta inválida",
            amount_in_cents: -100,
            category: "utilities",
            paid_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Valor não pode ser negativo.",
        action: "Insira um valor válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when amount_in_cents is missing", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: "Conta inválida",
            category: "utilities",
            paid_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Valor não foi informado.",
        action: "Insira um valor válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when paid_at is invalid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: "Conta inválida",
            amount_in_cents: 100,
            category: "utilities",
            paid_at: "data-invalida",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Data de pagamento inválida.",
        action:
          "Insira uma data de pagamento válida para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when due_date_at is invalid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: "Conta inválida",
            amount_in_cents: 100,
            category: "utilities",
            paid_at: new Date().toISOString(),
            due_date_at: "data-invalida",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Data de vencimento inválida.",
        action:
          "Insira uma data de vencimento válida para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail with invalid category", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: "Teste",
            amount_in_cents: 100,
            category: "invalid-category",
            paid_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Categoria inválida.",
        action: `Escolha uma categoria válida. Consulte a documentação para mais detalhes.`,
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("create financial expense when user is manager", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.manager,
      );

      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        description: financialExpenseInput.description,
        amount_in_cents: financialExpenseInput.amount_in_cents,
        category: financialExpenseInput.category,
        paid_at: financialExpenseInput.paid_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });
  });

  describe("Operator user", () => {
    test("deny create when user is operator", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny create when user is support", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.support,
      );

      const financialExpenseInput = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
        category: "utilities",
        paid_at: faker.date.past().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(financialExpenseInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialexpenses".',
        status_code: 403,
      });
    });
  });
});
