import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/customerorder", () => {
  describe("anonymous user", () => {
    test("should return 403 Forbidden", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:orders".',
        status_code: 403,
      });
    });
  });

  describe("customer user", () => {
    test("should return 403 Forbidden", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:orders".',
        status_code: 403,
      });
    });
  });

  describe("admin user", () => {
    test("should return 200 OK with customer orders list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const createdOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThan(0);
      expect(responseBody).toEqual([
        {
          id: createdOrder.id,
          customer_id: createdOrder.customer_id,
          status: createdOrder.status,
          notes: createdOrder.notes,
          location_refer: createdOrder.location_refer,
          lat: createdOrder.lat,
          lng: createdOrder.lng,
          username: createdOrder.username,
          email: createdOrder.email,
          cpf: createdOrder.cpf,
          phone: createdOrder.phone,
          address: createdOrder.address,
          created_at: createdOrder.created_at.toISOString(),
          start_date: createdOrder.start_date.toISOString(),
          end_date: createdOrder.end_date.toISOString(),
          customer_created_at: createdOrder.customer_created_at.toISOString(),
        },
      ]);
    });

    test("returns 200 and empty array when there are no orders", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test("invalid session token returns 401 Unauthorized", async () => {
      // se sua API retornar 401 para token inválido, ajuste a asserção abaixo
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=invalid_token_123`,
          },
        },
      );

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });

    test("response does not expose sensitive fields", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      const first = body[0];
      // Ajuste estes campos sensíveis conforme seu domínio (password, password_hash, ssn, etc.)
      expect(first).not.toHaveProperty("password");
      expect(first).not.toHaveProperty("password_hash");
      expect(first).not.toHaveProperty("secret_token");
    });
  });

  describe("manager user", () => {
    test("should return 200 OK with customer orders list", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const createdOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThan(0);
      expect(responseBody).toEqual([
        {
          id: createdOrder.id,
          customer_id: createdOrder.customer_id,
          status: createdOrder.status,
          notes: createdOrder.notes,
          location_refer: createdOrder.location_refer,
          lat: createdOrder.lat,
          lng: createdOrder.lng,
          username: createdOrder.username,
          email: createdOrder.email,
          cpf: createdOrder.cpf,
          phone: createdOrder.phone,
          address: createdOrder.address,
          created_at: createdOrder.created_at.toISOString(),
          start_date: createdOrder.start_date.toISOString(),
          end_date: createdOrder.end_date.toISOString(),
          customer_created_at: createdOrder.customer_created_at.toISOString(),
        },
      ]);
    });
  });

  describe("operator user", () => {
    test("should return 403 Forbidden", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:orders".',
        status_code: 403,
      });
    });
  });

  describe("support user", () => {
    test("should return 403 Forbidden", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:orders".',
        status_code: 403,
      });
    });
  });
});
