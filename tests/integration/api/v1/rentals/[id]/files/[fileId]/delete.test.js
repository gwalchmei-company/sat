import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/rentals/[id]/files/[fileId]", () => {
  describe("Anonymous user", () => {
    test("deny delete when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:rentalfiles".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny delete when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
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
        action:
          'Verifique se seu usuário possui a feature "delete:rentalfiles".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("delete file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "CONTRACT",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Arquivo deletado com sucesso.",
      });

      const filesResponse = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const files = await filesResponse.json();
      expect(files).toHaveLength(0);
    });

    test("return 404 when file does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const fakeFileId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${fakeFileId}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("NotFoundError");
      expect(responseBody.message).toBe("O arquivo não foi encontrado.");
    });

    test("return 400 when file_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const invalidFileId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${invalidFileId}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe("O id do arquivo não é válido.");
    });

    test("cannot delete already deleted file", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
      });

      await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("NotFoundError");
    });

    test("delete does not affect other files", async () => {
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

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file1.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const filesResponse = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const files = await filesResponse.json();
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe(file2.id);
    });
  });

  describe("Manager user", () => {
    test("delete file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "RETURN_PHOTO",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe("Arquivo deletado com sucesso.");
    });
  });

  describe("Operator user", () => {
    test("delete file successfully", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DELIVERY_PHOTO",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe("Arquivo deletado com sucesso.");
    });
  });

  describe("Support user", () => {
    test("delete file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();
      const file = await orchestrator.createRentalFile({
        rental_id: rental.id,
        type: "DAMAGE_REPORT",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files/${file.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe("Arquivo deletado com sucesso.");
    });
  });
});
