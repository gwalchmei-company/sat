import orchestrator from "tests/orchestrator.js";
import { v4 as generateUUID } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/customerorder/:id", () => {
  describe("anonymous user", () => {
    test("for any cases", async () => {
      const createdCustomerOrder = await orchestrator.createCustomerOrder();
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
        status_code: 403,
      });
    });
  });

  describe("customer user", () => {
    test("when accessing own order", async () => {
      const { session, user } = await orchestrator.createAuthenticatedUser();
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: createdCustomerOrder.id,
        customer_id: user.id,
      });
    });

    test("if not own order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
        status_code: 403,
      });
    });
  });

  describe("admin user", () => {
    test("when accessing own order", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({});
    });

    test("order by others users", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: anotherCustomerOrder.id,
        customer_id: anotherCustomerOrder.customer_id,
        status: anotherCustomerOrder.status,
        notes: anotherCustomerOrder.notes,
        location_refer: anotherCustomerOrder.location_refer,
        lat: anotherCustomerOrder.lat,
        lng: anotherCustomerOrder.lng,
        username: anotherCustomerOrder.username,
        email: anotherCustomerOrder.email,
        cpf: anotherCustomerOrder.cpf,
        phone: anotherCustomerOrder.phone,
        address: anotherCustomerOrder.address,
        deleted_at: anotherCustomerOrder.deleted_at,
        updated_at: anotherCustomerOrder.updated_at.toISOString(),
        start_date: anotherCustomerOrder.start_date.toISOString(),
        end_date: anotherCustomerOrder.end_date.toISOString(),
        created_at: anotherCustomerOrder.created_at.toISOString(),
        customer_created_at:
          anotherCustomerOrder.customer_created_at.toISOString(),
      });
    });

    test("when accessing with invalid id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/999999`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do pedido de cliente é inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 400,
      });
    });

    test("when accessing non-existing order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistingId = generateUUID();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${nonExistingId}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 404,
      });
    });
  });

  describe("manager user", () => {
    test("when accessing own order", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({});
    });

    test("order by others users", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: anotherCustomerOrder.id,
        customer_id: anotherCustomerOrder.customer_id,
        status: anotherCustomerOrder.status,
        notes: anotherCustomerOrder.notes,
        location_refer: anotherCustomerOrder.location_refer,
        lat: anotherCustomerOrder.lat,
        lng: anotherCustomerOrder.lng,
        username: anotherCustomerOrder.username,
        email: anotherCustomerOrder.email,
        cpf: anotherCustomerOrder.cpf,
        phone: anotherCustomerOrder.phone,
        address: anotherCustomerOrder.address,
        deleted_at: anotherCustomerOrder.deleted_at,
        updated_at: anotherCustomerOrder.updated_at.toISOString(),
        start_date: anotherCustomerOrder.start_date.toISOString(),
        end_date: anotherCustomerOrder.end_date.toISOString(),
        created_at: anotherCustomerOrder.created_at.toISOString(),
        customer_created_at:
          anotherCustomerOrder.customer_created_at.toISOString(),
      });
    });
  });

  describe("operator user", () => {
    test("when accessing own order", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("operator");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
        status_code: 403,
      });
    });

    test("if not own order", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
        status_code: 403,
      });
    });
  });

  describe("support user", () => {
    test("order by others users", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: anotherCustomerOrder.id,
        customer_id: anotherCustomerOrder.customer_id,
        status: anotherCustomerOrder.status,
        notes: anotherCustomerOrder.notes,
        location_refer: anotherCustomerOrder.location_refer,
        lat: anotherCustomerOrder.lat,
        lng: anotherCustomerOrder.lng,
        username: anotherCustomerOrder.username,
        email: anotherCustomerOrder.email,
        cpf: anotherCustomerOrder.cpf,
        phone: anotherCustomerOrder.phone,
        address: anotherCustomerOrder.address,
        deleted_at: anotherCustomerOrder.deleted_at,
        updated_at: anotherCustomerOrder.updated_at.toISOString(),
        start_date: anotherCustomerOrder.start_date.toISOString(),
        end_date: anotherCustomerOrder.end_date.toISOString(),
        created_at: anotherCustomerOrder.created_at.toISOString(),
        customer_created_at:
          anotherCustomerOrder.customer_created_at.toISOString(),
      });
    });

    test("when accessing own order", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("support");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({});
    });
  });
});
