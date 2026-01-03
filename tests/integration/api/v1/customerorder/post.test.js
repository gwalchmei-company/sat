import orchestrator from "tests/orchestrator.js";
import { faker } from "@faker-js/faker";
import { v4 as generateUUID } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/customerorder", () => {
  describe("anonymous user", () => {
    test("should return 403 Forbidden", async () => {
      const customerOrderData = {
        customer_id: generateUUID(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(customerOrderData),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:orders".',
        status_code: 403,
      });
    });
  });

  describe("customer user", () => {
    test("should create a customer order and return 201 Created", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const customerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(customerOrderData),
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(201);
      expect(responseBody).toEqual({
        id: responseBody.id,
        customer_id: user.id,
        start_date: customerOrderData.start_date,
        end_date: customerOrderData.end_date,
        status: "pending",
        notes: customerOrderData.notes,
        location_refer: customerOrderData.location_refer,
        lat: customerOrderData.lat,
        lng: customerOrderData.lng,
        deleted_at: responseBody.deleted_at,
        updated_at: responseBody.updated_at,
        created_at: responseBody.created_at,
      });
    });

    test("Without customer_id", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const incompleteCustomerOrderData = {
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 404,
      });
    });

    test("Without start_date", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const incompleteCustomerOrderData = {
        customer_id: user.id,
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "É necessário preencher uma data de início.",
        action:
          "Verifique se a data de início foi preenchida e tente novamente.",
        status_code: 400,
      });
    });

    test("Without end_date", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const incompleteCustomerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "É necessário preencher uma data de término.",
        action:
          "Verifique se a data de término foi preenchida e tente novamente.",
        status_code: 400,
      });
    });

    test("With status", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const incompleteCustomerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message:
          "Você não possui permissão para definir o status deste pedido.",
        action:
          'Remova o campo "status" ou solicite a feature "create:orders:status".',
        status_code: 403,
      });
    });

    test("With other custumer_id than own", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherUser = await orchestrator.createUser("customer");

      const incompleteCustomerOrderData = {
        customer_id: otherUser.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "create:orders" ou "create:orders:others".',
        status_code: 403,
      });
    });
  });

  describe("admin user", () => {
    test("should create a customer order and return 201 Created", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const customerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude({ precision: 6 }),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(customerOrderData),
        },
      );

      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody).toEqual({
        id: responseBody.id,
        customer_id: user.id,
        start_date: customerOrderData.start_date,
        end_date: customerOrderData.end_date,
        status: "approved",
        notes: customerOrderData.notes,
        location_refer: customerOrderData.location_refer,
        lat: customerOrderData.lat,
        lng: customerOrderData.lng,
        deleted_at: responseBody.deleted_at,
        updated_at: responseBody.updated_at,
        created_at: responseBody.created_at,
      });
    });

    test("create an order for another customer", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const otherUser = await orchestrator.createUser("customer");

      const incompleteCustomerOrderData = {
        customer_id: otherUser.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        status: "approved",
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(incompleteCustomerOrderData),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        customer_id: otherUser.id,
        start_date: incompleteCustomerOrderData.start_date,
        end_date: incompleteCustomerOrderData.end_date,
        status: "approved",
        notes: incompleteCustomerOrderData.notes,
        location_refer: incompleteCustomerOrderData.location_refer,
        lat: incompleteCustomerOrderData.lat,
        lng: incompleteCustomerOrderData.lng,
        deleted_at: responseBody.deleted_at,
        updated_at: responseBody.updated_at,
        created_at: responseBody.created_at,
      });
    });
  });

  describe("manager user", () => {
    test("should return 403 Forbidden", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");

      const customerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude({ precision: 6 }),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(customerOrderData),
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:orders".',
        status_code: 403,
      });
    });
  });

  describe("operator user", () => {
    test("should return 403 Forbidden", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("operator");

      const customerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude({ precision: 6 }),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(customerOrderData),
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:orders".',
        status_code: 403,
      });
    });
  });
  describe("support user", () => {
    test("should return 403 Forbidden", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("support");

      const customerOrderData = {
        customer_id: user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude({ precision: 6 }),
        lng: faker.location.longitude(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(customerOrderData),
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:orders".',
        status_code: 403,
      });
    });
  });
});
