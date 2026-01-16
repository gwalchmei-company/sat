import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/rentalfinancials", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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
    test("return only own rental financials when user is customer", async () => {
      const { session: session1, user: user1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: user2 } =
        await orchestrator.createAuthenticatedUser("customer");

      // Criar rentals e rental_financials para o user1
      const rental1 = await orchestrator.createRental({
        customer_id: user1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: user1.id,
      });
      const rentalFinancial1 = await orchestrator.createRentalFinancial({
        rental_id: rental1.id,
      });
      const rentalFinancial2 = await orchestrator.createRentalFinancial({
        rental_id: rental2.id,
      });

      // Criar rental e rental_financial para o user2 (não deve aparecer)
      const rental3 = await orchestrator.createRental({
        customer_id: user2.id,
      });
      await orchestrator.createRentalFinancial({
        rental_id: rental3.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session1.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      // Verificar que apenas os rental_financials do user1 estão presentes
      expect(responseBody.length).toBe(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rentalFinancial1.id,
            rental_id: rental1.id,
          }),
          expect.objectContaining({
            id: rentalFinancial2.id,
            rental_id: rental2.id,
          }),
        ]),
      );

      // Garantir que não há rental_financials de outros usuários
      const otherUsersFinancials = responseBody.filter(
        (rf) => rf.rental_id === rental3.id,
      );
      expect(otherUsersFinancials).toHaveLength(0);
    });

    test("return empty array when customer has no rental financials", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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
      expect(responseBody).toEqual([]);
    });
  });

  describe("Admin user", () => {
    test("return all rental financials when user is admin", async () => {
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

      const rentalFinancial1 = await orchestrator.createRentalFinancial({
        rental_id: rental1.id,
      });
      const rentalFinancial2 = await orchestrator.createRentalFinancial({
        rental_id: rental2.id,
      });
      const rentalFinancial3 = await orchestrator.createRentalFinancial({
        rental_id: rental3.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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
      expect(responseBody.length).toBeGreaterThanOrEqual(3);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rentalFinancial1.id,
            rental_id: rental1.id,
          }),
          expect.objectContaining({
            id: rentalFinancial2.id,
            rental_id: rental2.id,
          }),
          expect.objectContaining({
            id: rentalFinancial3.id,
            rental_id: rental3.id,
          }),
        ]),
      );
    });

    test("return rental financials with rental, device and customer information", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
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
        `http://localhost:3000/api/v1/rentalfinancials`,
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

      const createdRentalFinancial = responseBody.find(
        (rf) => rf.id === rentalFinancial.id,
      );
      expect(createdRentalFinancial).toBeDefined();
      expect(createdRentalFinancial).toMatchObject({
        id: rentalFinancial.id,
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
        start_date: rental.start_date.toISOString(),
        end_date: rental.end_date.toISOString(),
        rental_status: rental.status,
        serial_number: device.serial_number,
        device_model: device.model,
        username: customer.username,
        email: customer.email,
        cpf: customer.cpf,
      });
    });
  });

  describe("Manager user", () => {
    test("return all rental financials when user is manager", async () => {
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

      const rentalFinancial1 = await orchestrator.createRentalFinancial({
        rental_id: rental1.id,
      });
      const rentalFinancial2 = await orchestrator.createRentalFinancial({
        rental_id: rental2.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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
      expect(responseBody.length).toBeGreaterThanOrEqual(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rentalFinancial1.id,
            rental_id: rental1.id,
          }),
          expect.objectContaining({
            id: rentalFinancial2.id,
            rental_id: rental2.id,
          }),
        ]),
      );
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
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
