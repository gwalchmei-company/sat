import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/rentals/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        action: 'Verifique se seu usuário possui a feature "read:rentals".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("return rental when customer is the owner", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        customer_id: user.id,
        device_id: rental.device_id,
      });
    });

    test("deny access when customer is not the owner", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: otherCustomer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: otherCustomer.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para visualizar este aluguel.",
        action: "Você só pode visualizar seus próprios aluguéis.",
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("return rental when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        customer_id: customer.id,
        device_id: rental.device_id,
        serial_number: expect.any(String),
        device_model: expect.any(String),
        username: customer.username,
        email: customer.email,
      });
    });
  });

  describe("Manager user", () => {
    test("return rental when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        customer_id: customer.id,
      });
    });
  });

  describe("Operator user", () => {
    test("return rental when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        customer_id: customer.id,
      });
    });
  });

  describe("Support user", () => {
    test("return rental when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        customer_id: customer.id,
      });
    });
  });

  describe("Validation", () => {
    test("return 400 when rental id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/invalid-uuid`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("return 404 when rental does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${nonExistentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O aluguel não foi encontrado.",
        action: "Verifique o id informado e tente novamente.",
        status_code: 404,
      });
    });
  });
});
