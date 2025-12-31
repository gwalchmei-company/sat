import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import authorization from "models/authorization";
import { faker } from "@faker-js/faker";
import device from "models/device";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/devices/:id", () => {
  describe("Anonymous user", () => {
    test("should deny delete when user is anonymous", async () => {
      const createdDevice = await orchestrator.createDevice();
      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
        },
      );

      expectForbidden(response);
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);
    });
  });

  describe("Customer user", () => {
    test("should deny delete when user is customer", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const createdDevice = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);
    });
  });

  describe("Admin user", () => {
    test("should delete device when user is admin", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const createdDevice = await orchestrator.createDevice();
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      await expect(device.findOneById(createdDevice.id)).rejects.toMatchObject({
        name: "NotFoundError",
      });
    });

    test("should return 400 when admin provides invalid uuid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/123-invalid`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 400,
      });
    });

    test("should return 404 when admin tries to delete non-existent device", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);
      const fakeId = faker.string.uuid();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${fakeId}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 404,
      });
    });
  });

  describe("Manager user", () => {
    test("should deny delete when user is manager", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.manager,
      );

      const createdDevice = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);
    });
  });

  describe("Operator user", () => {
    test("should deny delete when user is operator", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const createdDevice = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);
    });
  });

  describe("Support user", () => {
    test("should deny delete when user is support", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.support,
      );

      const createdDevice = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expectForbidden(response);
      expect(await device.findOneById(createdDevice.id)).toEqual(createdDevice);
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
    action: 'Verifique se seu usuário possui a feature "delete:devices".',
    status_code: 403,
  });
}
