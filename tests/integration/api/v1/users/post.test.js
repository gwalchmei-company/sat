import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import password from "models/password.js";
import authorization from "models/authorization";
import { faker } from "@faker-js/faker/.";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("With unique and valid data", async () => {
      const cpf = orchestrator.cpf.generate(false);
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "ryangwalchmei",
          email: "contato@gwalchmei.com.br",
          password: "senha123",
          cpf,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "ryangwalchmei",
        email: "contato@gwalchmei.com.br",
        password: responseBody.password,
        features: ["read:activation_token"],
        cpf: cpf,
        phone: "91984546411",
        address: "rua tal, cidade tal, estado tal, pais tal",
        notes: null,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDatabase = await user.findOneByUsername("ryangwalchmei");
      const correctPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "SenhaErrada",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("With duplicated 'email'", async () => {
      const cpf = orchestrator.cpf.generate(false);
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "emailduplicado1",
          email: "duplicado@gwalchmei.com.br",
          password: "senha123",
          cpf,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "emailduplicado2",
          email: "Duplicado@gwalchmei.com.br",
          password: "senha123",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With duplicated 'username'", async () => {
      const cpf = orchestrator.cpf.generate(false);
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "usernameduplicado",
          email: "usernameduplicado1@gwalchmei.com.br",
          password: "senha123",
          cpf,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "UsernameDuplicado",
          email: "usernameduplicado2@gwalchmei.com.br",
          password: "senha123",
          cpf,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without 'CPF'", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "usernamevalid",
          email: "emailvalid@gwalchmei.com.br",
          password: "senha123",
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "CPF não foi informado ou inválido.",
        action: "Insira um CPF válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With duplicated 'CPF'", async () => {
      const cpfDuplicated = orchestrator.cpf.generate(false);
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "username1",
          email: "email1@gwalchmei.com.br",
          password: "senha123",
          cpf: cpfDuplicated,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "username2",
          email: "email2@gwalchmei.com.br",
          password: "senha123",
          cpf: cpfDuplicated,
          address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O CPF informado já está sendo utilizado.",
        action: "Utilize outro CPF para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without 'address'", async () => {
      const cpf = orchestrator.cpf.generate(false);
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "wihoutaddress",
          email: "wihoutaddress@gwalchmei.com.br",
          password: "senha123",
          cpf,
          // address: "rua tal, cidade tal, estado tal, pais tal",
          phone: "91984546411",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Endereço não foi informado.",
        action: "Insira um endereço para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Without 'phone'", async () => {
      const cpf = orchestrator.cpf.generate(false);
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "wihoutphone",
          email: "wihoutphone@gwalchmei.com.br",
          password: "senha123",
          cpf,
          address: "rua tal, cidade tal, estado tal, pais tal",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Número telefone não foi informado ou inválido.",
        action: "Insira um número telefone válido para realizar esta operação.",
        status_code: 400,
      });
    });
  });

  describe("Customer user", () => {
    test("Should not be able to create a user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: "ryangwalchmei",
          email: "contato@gwalchmei.com.br",
          password: "senha123",
        }),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:user".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("Should be able to create a user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(userCreated.id, authorization.featuresRoles.admin);

      const userObjectValues = {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: "senha123",
        cpf: orchestrator.cpf.generate(false),
        address: "rua tal, cidade tal, estado tal, pais tal",
        phone: "91984546411",
      };

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify(userObjectValues),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        ...userObjectValues,
        id: responseBody.id,
        features: ["read:activation_token"],
        notes: null,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDatabase = await user.findOneByUsername("ryangwalchmei");
      const correctPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "SenhaErrada",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Manager user", () => {
    test("Should be able to create a user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.manager,
      );

      const userObjectValues = {
        username: faker.internet.username(),
        email: faker.internet.email(),
        password: "senha123",
        cpf: orchestrator.cpf.generate(false),
        address: "rua tal, cidade tal, estado tal, pais tal",
        phone: "91984546411",
      };

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify(userObjectValues),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        ...userObjectValues,
        id: responseBody.id,
        features: ["read:activation_token"],
        notes: null,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDatabase = await user.findOneByUsername("ryangwalchmei");
      const correctPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "SenhaErrada",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Operator user", () => {
    test("Should not be able to create a user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.operator,
      );

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: "ryangwalchmei",
          email: "contato@gwalchmei.com.br",
          password: "senha123",
        }),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:user".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("Should not be able to create a user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.support,
      );

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: "ryangwalchmei",
          email: "contato@gwalchmei.com.br",
          password: "senha123",
        }),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:user".',
        status_code: 403,
      });
    });
  });
});
