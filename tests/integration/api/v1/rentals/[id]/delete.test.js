import orchestrator from "tests/orchestrator.js";
import rental from "models/rental.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/rentals/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const createdRental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
        },
      );

      expectForbidden(response);
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const createdRental = await orchestrator.createRental({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });
    });
  });

  describe("Admin user", () => {
    test("delete rental successfully when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const createdRental = await orchestrator.createRental();
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({});

      await expect(rental.findOneById(createdRental.id)).rejects.toMatchObject({
        name: "NotFoundError",
      });
    });

    test("return 400 when admin provides invalid uuid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/invalid-uuid`,
        {
          method: "DELETE",
          headers: {
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

    test("return 404 when admin tries to delete non-existent rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${nonExistentId}`,
        {
          method: "DELETE",
          headers: {
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

    test("return 404 when admin tries to delete already deleted rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const createdRental = await orchestrator.createRental();

      // First delete
      await fetch(`http://localhost:3000/api/v1/rentals/${createdRental.id}`, {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${session.token}`,
        },
      });

      // Try to delete again
      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
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

  describe("Manager user", () => {
    test("deny access when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const createdRental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const createdRental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const createdRental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${createdRental.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await rental.findOneById(createdRental.id)).toMatchObject({
        id: createdRental.id,
      });
    });
  });
});

async function expectForbidden(response) {
  expect(response.status).toBe(403);
  expect(response.headers.get("content-type")).toContain("application/json");

  const body = await response.json();
  expect(body).toEqual({
    name: "ForbiddenError",
    message: "Você não possui permissão para executar essa ação",
    action: 'Verifique se seu usuário possui a feature "delete:rentals".',
    status_code: 403,
  });
}
