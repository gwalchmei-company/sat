import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import authorization from "models/authorization";
import { faker } from "@faker-js/faker/.";
import device from "models/device";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/devices/:id", () => {
  describe("Anonymous user", () => {
    test("With all device data valid", async () => {
      const createdDevice = await orchestrator.createDevice();
      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${createdDevice.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:devices".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("With all device data valid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const deviceCreated = await orchestrator.createDevice();

      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:devices".',
        status_code: 403,
      });

      const deviceAfter = await device.findOneById(deviceCreated.id);
      expect(deviceAfter).toEqual(deviceCreated);
    });
  });

  describe("Admin user", () => {
    test("With all device data valid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const deviceCreated = await orchestrator.createDevice();

      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );
      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        ...newValues,
        id: responseBody.id,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });

      expect(new Date(responseBody.updated_at).getTime()).toBeGreaterThan(
        new Date(deviceCreated.updated_at).getTime(),
      );

      const deviceInDb = await device.findOneById(deviceCreated.id);

      expect(deviceInDb.status).toBe("rented");
      expect(deviceInDb.model).toBe("Kit Standart Mini");
    });

    test("With invalid UUID", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/123-invalid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ status: "rented" }),
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

    test("With valid UUID but non-existent device", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);
      const fakeId = faker.string.uuid();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${fakeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ status: "rented" }),
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

    test("With empty body should not update anything", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const session = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Nenhum dado foi informado para atualizar este dispositivo.",
        action: "Forneça os dados que deseja atualizar e tente novamente.",
        status_code: 400,
      });
    });

    test("With forbidden field", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const session = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            id: "hack-id",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'Não é permitido atualizar o campo "id" do dispositivo.',
        action: 'Remova o campo "id" do input e tente novamente.',
        status_code: 400,
      });
    });

    test("Should not allow created_at update", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const session = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            created_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message:
          'Não é permitido atualizar o campo "created_at" do dispositivo.',
        action: 'Remova o campo "created_at" do input e tente novamente.',
        status_code: 400,
      });
    });
    test("Should not allow updated_at update", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const session = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            updated_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message:
          'Não é permitido atualizar o campo "updated_at" do dispositivo.',
        action: 'Remova o campo "updated_at" do input e tente novamente.',
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("With all device data valid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.manager,
      );

      const deviceCreated = await orchestrator.createDevice();

      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );
      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        ...newValues,
        id: responseBody.id,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });

      expect(new Date(responseBody.updated_at).getTime()).toBeGreaterThan(
        new Date(deviceCreated.updated_at).getTime(),
      );

      const deviceInDb = await device.findOneById(deviceCreated.id);

      expect(deviceInDb.status).toBe("rented");
      expect(deviceInDb.model).toBe("Kit Standart Mini");
    });
  });

  describe("Operator user", () => {
    test("With fields unauthorizated", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const deviceCreated = await orchestrator.createDevice();

      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message:
          "Você não possui permissão para atualizar os dados deste dispositivo.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
        status_code: 403,
      });

      const deviceAfter = await device.findOneById(deviceCreated.id);

      expect(deviceAfter).toEqual(deviceCreated);
    });

    test("With status only", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const deviceCreated = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            status: "rented",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        ...deviceCreated,
        status: "rented",
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.email_acc).toBe(deviceCreated.email_acc);
      expect(responseBody.model).toBe(deviceCreated.model);
      expect(responseBody.provider).toBe(deviceCreated.provider);

      expect(responseBody.created_at).toBe(
        deviceCreated.created_at.toISOString(),
      );
      expect(new Date(responseBody.updated_at).getTime()).toBeGreaterThan(
        new Date(deviceCreated.updated_at).getTime(),
      );
    });

    test("Operator cannot update restricted fields silently", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const session = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const deviceCreated = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            provider: "HackedProvider",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message:
          "Você não possui permissão para atualizar os dados deste dispositivo.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
        status_code: 403,
      });

      const deviceAfter = await device.findOneById(deviceCreated.id);
      expect(deviceAfter).toEqual(deviceCreated);
    });
  });

  describe("Support user", () => {
    test("With all device data valid", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.support,
      );

      const deviceCreated = await orchestrator.createDevice();

      const newValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart Mini",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "rented",
        notes: faker.lorem.text(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:devices".',
        status_code: 403,
      });
      const deviceAfter = await device.findOneById(deviceCreated.id);
      expect(deviceAfter).toEqual(deviceCreated);
    });
  });
});
