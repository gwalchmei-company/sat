import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/rentals/[id]/files", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      await orchestrator.createRentalFile({ rental_id: rental.id });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:rentalfiles".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("allow customer to view files from their own rental", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });

      const file1 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "CONTRACT",
      });
      const file2 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DELIVERY_PHOTO",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(2);
      expect(responseBody[0].id).toBe(file2.id);
      expect(responseBody[1].id).toBe(file1.id);
    });

    test("deny customer to view files from other customer's rental", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const otherCustomer =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: otherCustomer.user.id,
      });
      await orchestrator.createRentalFile({ rental_id: rental.id });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
      expect(responseBody.message).toBe(
        "Você não possui permissão para visualizar esses arquivos.",
      );
    });

    test("return empty array when rental has no files", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
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
    test("allow admin to view files from any rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const file1 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "CONTRACT",
        file_name: "contract.pdf",
      });
      const file2 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "RETURN_PHOTO",
        file_name: "return.jpg",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(2);
      expect(responseBody[0]).toMatchObject({
        id: file2.id,
        rental_id: rental.id,
        type: "RETURN_PHOTO",
        file_name: "return.jpg",
        uploaded_by_username: expect.any(String),
      });
      expect(responseBody[1]).toMatchObject({
        id: file1.id,
        rental_id: rental.id,
        type: "CONTRACT",
        file_name: "contract.pdf",
        uploaded_by_username: expect.any(String),
      });
    });

    test("return empty array when rental has no files", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual([]);
    });

    test("return 404 when rental does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const fakeRentalId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${fakeRentalId}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("NotFoundError");
      expect(responseBody.message).toBe("O aluguel não foi encontrado.");
    });

    test("return 400 when rental_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const invalidRentalId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${invalidRentalId}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe("O id do aluguel não é válido.");
    });

    test("return files ordered by created_at DESC", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const file1 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "CONTRACT",
      });

      const file2 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DELIVERY_PHOTO",
      });

      const file3 = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "RETURN_PHOTO",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(3);
      expect(responseBody[0].id).toBe(file3.id);
      expect(responseBody[1].id).toBe(file2.id);
      expect(responseBody[2].id).toBe(file1.id);
    });
  });

  describe("Manager user", () => {
    test("allow manager to view files from any rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DAMAGE_REPORT",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(1);
      expect(responseBody[0].id).toBe(file.id);
      expect(responseBody[0].type).toBe("DAMAGE_REPORT");
    });
  });

  describe("Operator user", () => {
    test("allow operator to view files from any rental", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DELIVERY_PHOTO",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(1);
      expect(responseBody[0].id).toBe(file.id);
    });
  });

  describe("Support user", () => {
    test("allow support to view files from any rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "PAYMENT_RECEIPT",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(1);
      expect(responseBody[0].id).toBe(file.id);
      expect(responseBody[0].type).toBe("PAYMENT_RECEIPT");
    });
  });

  describe("Multiple files scenario", () => {
    test("return only files from the specific rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental1 = await orchestrator.createRental();
      const rental2 = await orchestrator.createRental();

      await orchestrator.createRentalFile({
        rental_id: rental1.id,
        type: "CONTRACT",
      });
      const file2 = await orchestrator.createRentalFile({
        rental_id: rental1.id,
        type: "DELIVERY_PHOTO",
      });
      await orchestrator.createRentalFile({
        rental_id: rental2.id,
        type: "CONTRACT",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental1.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toHaveLength(2);
      expect(responseBody.every((file) => file.rental_id === rental1.id)).toBe(
        true,
      );
      expect(responseBody.some((file) => file.id === file2.id)).toBe(true);
    });
  });
});
