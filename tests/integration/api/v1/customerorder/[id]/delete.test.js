import customerOrder from "models/customer-order";
import orchestrator from "tests/orchestrator.js";
import { v4 as generateUUID } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/customerorder/:id", () => {
  describe("anonymous user", () => {
    test("for any cases", async () => {
      const createdCustomerOrder = await orchestrator.createCustomerOrder();
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        action: 'Verifique se seu usuário possui a feature "delete:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });

      expect(await hasDeletedOrder(createdCustomerOrder.id)).toBe(false);
    });
  });

  describe("customer user", () => {
    test("own order", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
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
        action: 'Verifique se seu usuário possui a feature "delete:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });

      expect(await hasDeletedOrder(createdCustomerOrder.id)).toBe(false);
    });

    test("another customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
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
        action: 'Verifique se seu usuário possui a feature "delete:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
      expect(await hasDeletedOrder(anotherCustomerOrder.id)).toBe(false);
    });
  });

  describe("admin user", () => {
    test("With valid id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(await hasDeletedOrder(anotherCustomerOrder.id)).toBe(true);
    });

    test("repeat delete", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const firstCustomerOrder = await orchestrator.createCustomerOrder();

      const response1 = await fetch(
        `http://localhost:3000/api/v1/customerorder/${firstCustomerOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response1.status).toBe(200);
      expect(await hasDeletedOrder(firstCustomerOrder.id)).toBe(true);

      const response2 = await fetch(
        `http://localhost:3000/api/v1/customerorder/${firstCustomerOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response2.status).toBe(404);
      const responseBody2 = await response2.json();
      expect(responseBody2).toEqual({
        name: "NotFoundError",
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 404,
      });
    });
    test("With non-exist id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const noExistentId = generateUUID();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${noExistentId}`,
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
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 404,
      });
    });

    test("With invalid id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/invalid-uuid-format`,
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
        message: "O id do pedido de cliente é inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 400,
      });
    });

    test("Deleting a completed order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const completedOrder = await orchestrator.createCustomerOrder({
        status: "completed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${completedOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(await hasDeletedOrder(completedOrder.id)).toBe(true);
    });
  });

  describe("manager user", () => {
    test("With valid id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(await hasDeletedOrder(anotherCustomerOrder.id)).toBe(true);
    });

    test("Deleting a completed order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const completedOrder = await orchestrator.createCustomerOrder({
        status: "completed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${completedOrder.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      expect(await hasDeletedOrder(completedOrder.id)).toBe(false);
    });
  });

  describe("operator user", () => {
    test("for any cases", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const createdCustomerOrder = await orchestrator.createCustomerOrder();
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
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
        action: 'Verifique se seu usuário possui a feature "delete:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
      expect(await hasDeletedOrder(createdCustomerOrder.id)).toBe(false);
    });
  });

  describe("support user", () => {
    test("for any cases", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const createdCustomerOrder = await orchestrator.createCustomerOrder();
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
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
        action: 'Verifique se seu usuário possui a feature "delete:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
      expect(await hasDeletedOrder(createdCustomerOrder.id)).toBe(false);
    });
  });
});

async function hasDeletedOrder(orderId) {
  return await customerOrder
    .findOneById(orderId)
    .then((order) => (order.deleted_at === null ? false : true));
}
