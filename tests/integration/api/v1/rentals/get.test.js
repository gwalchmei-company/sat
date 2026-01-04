import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/rentals", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("return only own rentals when user is customer", async () => {
      const { session: session1, user: user1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: user2 } =
        await orchestrator.createAuthenticatedUser("customer");

      // Criar rentals para o user1
      const rental1 = await orchestrator.createRental({
        customer_id: user1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: user1.id,
      });

      // Criar rental para o user2 (não deve aparecer)
      await orchestrator.createRental({
        customer_id: user2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session1.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      // Filtrar apenas os rentals do user1
      const user1Rentals = responseBody.filter(
        (rental) => rental.customer_id === user1.id,
      );

      expect(user1Rentals.length).toBeGreaterThanOrEqual(2);
      expect(user1Rentals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental1.id,
            customer_id: user1.id,
          }),
          expect.objectContaining({
            id: rental2.id,
            customer_id: user1.id,
          }),
        ]),
      );

      // Garantir que não há rentals de outros usuários
      const otherUsersRentals = responseBody.filter(
        (rental) => rental.customer_id !== user1.id,
      );
      expect(otherUsersRentals).toHaveLength(0);
    });

    test("return empty array when customer has no rentals", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual([]);
    });
  });

  describe("Admin user", () => {
    test("return all rentals when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: customer2 } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: customer1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: customer2.id,
      });
      const rental3 = await orchestrator.createRental({
        customer_id: customer1.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBeGreaterThanOrEqual(3);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental1.id,
            customer_id: customer1.id,
          }),
          expect.objectContaining({
            id: rental2.id,
            customer_id: customer2.id,
          }),
          expect.objectContaining({
            id: rental3.id,
            customer_id: customer1.id,
          }),
        ]),
      );
    });

    test("return rentals with device and customer information", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      const createdRental = responseBody.find((r) => r.id === rental.id);
      expect(createdRental).toBeDefined();
      expect(createdRental).toMatchObject({
        id: rental.id,
        device_id: device.id,
        customer_id: customer.id,
        serial_number: device.serial_number,
        device_model: device.model,
        username: customer.username,
        email: customer.email,
        cpf: customer.cpf,
        phone: customer.phone,
      });
    });
  });

  describe("Manager user", () => {
    test("return all rentals when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const { user: customer1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: customer2 } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: customer1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: customer2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBeGreaterThanOrEqual(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental1.id,
            customer_id: customer1.id,
          }),
          expect.objectContaining({
            id: rental2.id,
            customer_id: customer2.id,
          }),
        ]),
      );
    });
  });

  describe("Operator user", () => {
    test("return all rentals when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const { user: customer1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: customer2 } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: customer1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: customer2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBeGreaterThanOrEqual(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental1.id,
            customer_id: customer1.id,
          }),
          expect.objectContaining({
            id: rental2.id,
            customer_id: customer2.id,
          }),
        ]),
      );
    });
  });

  describe("Support user", () => {
    test("return all rentals when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const { user: customer1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: customer2 } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: customer1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: customer2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBeGreaterThanOrEqual(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental1.id,
            customer_id: customer1.id,
          }),
          expect.objectContaining({
            id: rental2.id,
            customer_id: customer2.id,
          }),
        ]),
      );
    });
  });
});
