import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/rentalfinancials/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("return own rental financial when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        id: rentalFinancial.id,
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
        customer_id: user.id,
      });
    });

    test("deny access when trying to access another customer rental financial", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: otherCustomer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: otherCustomer.id,
      });
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        message: "Você não possui permissão para acessar este recurso.",
        action:
          "Você só pode acessar registros financeiros dos seus próprios aluguéis.",
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("return any rental financial when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");
      const device = await orchestrator.createDevice();

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
        device_id: device.id,
      });
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
        daily_price_in_cents: 15000,
        total_price_in_cents: 90000,
        deposit_in_cents: 30000,
        discount_in_cents: 10000,
        final_price_in_cents: 80000,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        id: rentalFinancial.id,
        rental_id: rental.id,
        daily_price_in_cents: 15000,
        total_price_in_cents: 90000,
        deposit_in_cents: 30000,
        discount_in_cents: 10000,
        final_price_in_cents: 80000,
        customer_id: customer.id,
        serial_number: device.serial_number,
        device_model: device.model,
        username: customer.username,
        email: customer.email,
        cpf: customer.cpf,
      });
    });

    test("fail when rental financial id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/invalid-uuid`,
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
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental financial does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${nonExistentId}`,
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
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("return any rental financial when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        id: rentalFinancial.id,
        rental_id: rental.id,
        customer_id: customer.id,
      });
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:rentalfinancials".',
        status_code: 403,
      });
    });
  });
});
