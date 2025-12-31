import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import { faker } from "@faker-js/faker/.";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/devices", () => {
  describe("Anonymous user", () => {
    test("With unique and valid data", async () => {
      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:devices".',
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With unique and valid data", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const deviceObjectValues = {
        email_acc: faker.internet.email(),
        utid_device: faker.database.mongodbObjectId(),
        serial_number: faker.database.mongodbObjectId(),
        serial_number_router: faker.database.mongodbObjectId(),
        model: "Kit Standart",
        provider: "Starlink",
        tracker_code: faker.location.zipCode(),
        status: "available",
        notes: faker.lorem.text(),
      };

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify(deviceObjectValues),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        ...deviceObjectValues,
        id: responseBody.id,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("With duplicated UTID", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const duplicatedUtid = faker.database.mongodbObjectId();

      // Create the first device with the UTID
      await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: duplicatedUtid,
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      // Attempt to create a second device with the same UTID
      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: duplicatedUtid,
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O UTID informado já está sendo utilizado.",
        action: "Utilize outro UTID para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With duplicated Serial Number", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const duplicatedSerialNumber = faker.database.mongodbObjectId();

      // Create the first device with the Serial Number
      await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: duplicatedSerialNumber,
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      // Attempt to create a second device with the same Serial Number
      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: duplicatedSerialNumber,
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O S/N informado já está sendo utilizado.",
        action: "Utilize outro S/N para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without required field 'email_acc'", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          // email_acc is missing
          utid_device: faker.database.mongodbObjectId(),
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message:
          "Email vinculado a ACC do equipamento não foi informado ou inválido.",
        action: "Insira um email válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without required field 'UTID_device'", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          // utid_device is missing
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "UTID do equipamento não foi informado ou inválido.",
        action: "Insira um UTID válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without required field 'serial_number'", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          // serial_number is missing
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "S/N não foi informado ou inválido.",
        action: "Insira um S/N válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without required field 'serial_number_router'", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: faker.database.mongodbObjectId(),
          // serial_number_router is missing
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "S/N do roteador não foi informado ou inválido.",
        action: "Insira um S/N do roteador válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without required field 'model'", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          // model is missing
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "available",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Modelo do equipamento não foi informado.",
        action: "Insira o modelo para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With invalid status value", async () => {
      const userCreated = await orchestrator.createUser();
      const userActivated = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);

      await user.setFeatures(userCreated.id, [
        ...userActivated.features,
        "create:devices",
      ]);

      const response = await fetch("http://localhost:3000/api/v1/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email_acc: faker.internet.email(),
          utid_device: faker.database.mongodbObjectId(),
          serial_number: faker.database.mongodbObjectId(),
          serial_number_router: faker.database.mongodbObjectId(),
          model: "Kit Standart",
          provider: "Starlink",
          tracker_code: faker.location.zipCode(),
          status: "invalid_status_value",
          notes: faker.lorem.text(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Valor de status não é válido.",
        action:
          "Escolha entre 'available', 'rented', 'maintenance', 'blocked' para continuar.",
        status_code: 400,
      });
    });
  });
});
