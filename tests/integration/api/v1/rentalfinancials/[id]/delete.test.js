import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/rentalfinancials/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "DELETE",
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
          'Verifique se seu usuário possui a feature "delete:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "DELETE",
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
          'Verifique se seu usuário possui a feature "delete:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("delete rental financial successfully (soft delete)", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({});

      // Verificar que o registro foi soft deleted
      const getResponse = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(getResponse.status).toBe(400);
      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("fail when id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/invalid-uuid`,
        {
          method: "DELETE",
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
          method: "DELETE",
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

    test("verify deleted rental financial does not appear in list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      // Deletar
      await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      // Verificar que não aparece na listagem
      const listResponse = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(listResponse.status).toBe(200);
      const listResponseBody = await listResponse.json();
      const deletedItem = listResponseBody.find(
        (rf) => rf.id === rentalFinancial.id,
      );
      expect(deletedItem).toBeUndefined();
    });
  });

  describe("Manager user", () => {
    test("delete rental financial successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({});
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
          method: "DELETE",
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
          'Verifique se seu usuário possui a feature "delete:rentalfinancials".',
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
          method: "DELETE",
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
          'Verifique se seu usuário possui a feature "delete:rentalfinancials".',
        status_code: 403,
      });
    });
  });
});
