import customerOrder from "models/customer-order";
import orchestrator from "tests/orchestrator.js";
import { v4 as generateUUID } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/customerorder/:id", () => {
  describe("anonymous user", () => {
    test("for any cases", async () => {
      const createdCustomerOrder = await orchestrator.createCustomerOrder();
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
          headers: { "Content-Type": "application/json" },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        action: 'Verifique se seu usuário possui a feature "update:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
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
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ notes: "Updated notes" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.notes).toBe("Updated notes");
      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.notes).toBe("Updated notes");
    });

    test("another customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ notes: "Malicious update" }),
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
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "update:orders:others" ou "update:orders:self".',
        status_code: 403,
      });
      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.notes).not.toBe("Malicious update");
    });

    test("when own order has status approved", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser();
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
        status: "approved",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ notes: "Updated notes" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não tem mais permissão para atualizar este pedido.",
        action:
          "Somente pedidos em análise podem ser atualizados pelo cliente.",
        status_code: 403,
      });

      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.notes).not.toBe("Updated notes");
    });

    test("trying to approve own order", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message:
          "Você não possui permissão para definir o status deste pedido.",
        action:
          'Remova o campo "status", verifique a feature "update:orders:status" ou se o pedido lhe pertence.',
        status_code: 403,
      });
      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("pending");
    });

    test("cancel own order", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "canceled" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("canceled");

      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("canceled");
    });

    test("trying cancel not own order", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "canceled" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "update:orders:others" ou "update:orders:self".',
        status_code: 403,
      });
      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("pending");
    });

    test("with lat and lng", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ lat: -23.55052, lng: -46.633308 }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.lat).toBe(-23.55052);
      expect(responseBody.lng).toBe(-46.633308);

      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.lat).toBe(-23.55052);
      expect(updatedOrderInDb.lng).toBe(-46.633308);
    });

    test("with incorrect lat", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ lat: "invalid-lat", lng: -46.633308 }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: `A latitude informada é inválida.`,
        action: `Verifique o valor da latitude e tente novamente.`,
        status_code: 400,
      });

      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.lat).toBe(createdCustomerOrder.lat);
      expect(updatedOrderInDb.lng).toBe(createdCustomerOrder.lng);
    });

    test("with incorrect lng", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ lat: -23.55052, lng: "invalid-lng" }),
        },
      );
      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: `A longitude informada é inválida.`,
        action: `Verifique o valor da longitude e tente novamente.`,
        status_code: 400,
      });

      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.lat).toBe(createdCustomerOrder.lat);
      expect(updatedOrderInDb.lng).toBe(createdCustomerOrder.lng);
    });

    test("when end_date is below start_date", async () => {
      const { session, user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const createdCustomerOrder = await orchestrator.createCustomerOrder({
        customer_id: customerUser.id,
      });
      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${createdCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            start_date: new Date("2024-12-10T10:00:00Z"),
            end_date: new Date("2024-12-05T10:00:00Z"),
          }),
        },
      );
      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: `A data de término não pode ser anterior à data de início.`,
        action: `Verifique as datas informadas e tente novamente.`,
        status_code: 400,
      });
      const updatedOrderInDb = await customerOrder.findOneById(
        createdCustomerOrder.id,
      );
      expect(updatedOrderInDb.start_date.toISOString()).toBe(
        createdCustomerOrder.start_date.toISOString(),
      );
      expect(updatedOrderInDb.end_date.toISOString()).toBe(
        createdCustomerOrder.end_date.toISOString(),
      );
    });
  });

  describe("admin user", () => {
    test("update all fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            customer_id: anotherCustomerOrder.customer_id,
            start_date: anotherCustomerOrder.start_date,
            end_date: anotherCustomerOrder.end_date,
            status: "rejected",
            notes: "Updated by admin",
            location_refer: "New location",
            lat: -23.55052,
            lng: -46.633308,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: anotherCustomerOrder.id,
        customer_id: anotherCustomerOrder.customer_id,
        start_date: anotherCustomerOrder.start_date.toISOString(),
        end_date: anotherCustomerOrder.end_date.toISOString(),
        status: "rejected",
        notes: "Updated by admin",
        location_refer: "New location",
        lat: -23.55052,
        lng: -46.633308,
        created_at: anotherCustomerOrder.created_at.toISOString(),
        updated_at: responseBody.updated_at,
        deleted_at: null,
      });

      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("rejected");
      expect(updatedOrderInDb.notes).toBe("Updated by admin");
      expect(updatedOrderInDb.location_refer).toBe("New location");

      expect(updatedOrderInDb.created_at.toISOString()).toBe(
        anotherCustomerOrder.created_at.toISOString(),
      );
      expect(updatedOrderInDb.updated_at.toISOString()).toBe(
        responseBody.updated_at,
      );
      expect(
        updatedOrderInDb.updated_at > anotherCustomerOrder.created_at,
      ).toBe(true);
    });
    test("approve any customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("approved");

      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("approved");
    });

    test("reject any customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "rejected" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("rejected");
      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("rejected");
    });

    test("when trying to update with uuid invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/invalid-uuid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
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

    test("when trying to update non-existing order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistingOrderId = generateUUID();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${nonExistingOrderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
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

    test("when trying to update with invalid status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "invalid-status" }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: `O status informado é inválido.`,
        action: `Verifique os status permitidos e tente novamente.`,
        status_code: 400,
      });
    });

    test("with trying to update without body", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
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
        message: "O corpo da requisição está vazio ou inválido.",
        action: "Verifique os dados enviados e tente novamente.",
        status_code: 400,
      });
    });
  });

  describe("manager user", () => {
    test("approve any customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("approved");
      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("approved");
    });

    test("reject any customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "rejected" }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("rejected");
      const updatedOrderInDb = await customerOrder.findOneById(
        anotherCustomerOrder.id,
      );
      expect(updatedOrderInDb.status).toBe("rejected");
    });
  });

  describe("operator user", () => {
    test("approve any customer's order", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        action: 'Verifique se seu usuário possui a feature "update:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
    });
  });

  describe("support user", () => {
    test("approve any customer's order", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const anotherCustomerOrder = await orchestrator.createCustomerOrder();

      const response = await fetch(
        `http://localhost:3000/api/v1/customerorder/${anotherCustomerOrder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        action: 'Verifique se seu usuário possui a feature "update:orders".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
    });
  });
});
