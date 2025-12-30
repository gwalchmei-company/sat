import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import password from "models/password.js";
import { cpf } from "cpf-cnpj-validator";
import authorization from "models/authorization";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/:username", () => {
  describe("Anonymous user", () => {
    test("With all user data valid", async () => {
      const createdUser = await orchestrator.createUser();
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "newusernamecustomer",
            email: "newemail@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:user".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("Change user self data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "customerUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newusernamecustomer",
            email: "newemail@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "newusernamecustomer",
        email: "newemail@gwalchmei.com.br",
        password: responseBody.password,
        cpf: responseBody.cpf,
        phone: "12345678901",
        address: "Rua tal, cidade Tal",
        notes: "lorem ipsum",
        features: authorization.featuresRoles.customer,

        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.cpf != createdUser.cpf).toBe(true);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        "newusernamecustomer",
      );
      const correctPasswordMatch = await password.compare(
        "newpassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("Change other user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "customerSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const otherUser = await orchestrator.createUser({
        username: "otherUserToCostumeChange",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "otherUsername",
            email: "otherUsername@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para ler este usuário.",
        action: 'Verifique a feature "update:user" ou "update:user:others".',
        status_code: 403,
      });
    });

    test("With nonexistent 'username'", async () => {
      const createdUser = await orchestrator.createUser({
        username: "customerUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );
      const response = await fetch(
        "http://localhost:3000/api/v1/users/UsuarioInexistente",
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status_code: 404,
      });
    });

    test("With duplicated 'username'", async () => {
      const createdUser = await orchestrator.createUser({
        username: "user1",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      await orchestrator.createUser({
        username: "user2",
      });

      const response = await fetch("http://localhost:3000/api/v1/users/user1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: "user2",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With duplicated 'email'", async () => {
      const createdUser = await orchestrator.createUser({
        email: "email1@gwalchmei.com.br",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      await orchestrator.createUser({
        email: "email2@gwalchmei.com.br",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "email2@gwalchmei.com.br",
          }),
        },
      );

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With unique 'username'", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "uniqueUser2",
        email: createdUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: createdUser.cpf,
        phone: createdUser.phone,
        address: createdUser.address,
        notes: createdUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With unique 'email'", async () => {
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,

        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "uniqueEmail2@gwalchmei.com.br",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: createdUser.username,
        email: "uniqueEmail2@gwalchmei.com.br",
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: createdUser.cpf,
        phone: createdUser.phone,
        address: createdUser.address,
        notes: createdUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With new 'password'", async () => {
      const createdUser = await orchestrator.createUser({
        password: "newPassword1",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "newPassword2",
          }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: createdUser.username,
        email: createdUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: createdUser.cpf,
        phone: createdUser.phone,
        address: createdUser.address,
        notes: createdUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(createdUser.username);
      const correctPasswordMatch = await password.compare(
        "newPassword2",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Admin user", () => {
    test("Change user self data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "adminUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newusernameadmin",
            email: "newemailUserAdmin@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "newusernameadmin",
        email: "newemailUserAdmin@gwalchmei.com.br",
        password: responseBody.password,
        cpf: responseBody.cpf,
        phone: "12345678901",
        address: "Rua tal, cidade Tal",
        notes: "lorem ipsum",
        features: authorization.featuresRoles.admin,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.cpf != createdUser.cpf).toBe(true);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        "newusernamecustomer",
      );
      const correctPasswordMatch = await password.compare(
        "newpassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("Change other user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "adminSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const otherUser = await orchestrator.createUser({
        username: "otherUserToAdminChange",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "otherUsername",
            email: "otherUsername@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "otherUsername",
        email: "otherUsername@gwalchmei.com.br",
        password: responseBody.password,
        cpf: responseBody.cpf,
        phone: "12345678901",
        address: "Rua tal, cidade Tal",
        notes: "lorem ipsum",
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.cpf != createdUser.cpf).toBe(true);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        "newusernamecustomer",
      );
      const correctPasswordMatch = await password.compare(
        "newpassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Manager user", () => {
    test("Change user self data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "managerUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.manager,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newusernameManager",
            email: "newemailUserManager@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "newusernameManager",
        email: "newemailUserManager@gwalchmei.com.br",
        password: responseBody.password,
        cpf: responseBody.cpf,
        phone: "12345678901",
        address: "Rua tal, cidade Tal",
        notes: "lorem ipsum",
        features: authorization.featuresRoles.manager,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.cpf != createdUser.cpf).toBe(true);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        "newusernamecustomer",
      );
      const correctPasswordMatch = await password.compare(
        "newpassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });

    test("Change other user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "managerSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.manager,
      );

      const otherUser = await orchestrator.createUser({
        username: "otherUserToManagerChange",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newOtherUsernameManager",
            email: "newOtherUsernameManager@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "newOtherUsernameManager",
        email: "newOtherUsernameManager@gwalchmei.com.br",
        password: responseBody.password,
        cpf: responseBody.cpf,
        phone: "12345678901",
        address: "Rua tal, cidade Tal",
        notes: "lorem ipsum",
        features: responseBody.features,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(responseBody.cpf != createdUser.cpf).toBe(true);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(
        "newusernamecustomer",
      );
      const correctPasswordMatch = await password.compare(
        "newpassword",
        userInDatabase.password,
      );

      const incorrectPasswordMatch = await password.compare(
        "newPassword1",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);
    });
  });

  describe("Operator user", () => {
    test("Change user self data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "operatorUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newusernamecustomer",
            email: "newemail@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:user".',
        status_code: 403,
      });
    });

    test("Change other user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "operatorSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.operator,
      );

      const otherUser = await orchestrator.createUser({
        username: "otherUserToOperatorChange",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "otherUsername",
            email: "otherUsername@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:user".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("Change user self data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "supportUserSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.support,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "newusernamecustomer",
            email: "newemail@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:user".',
        status_code: 403,
      });
    });

    test("Change other user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "SupportSelf",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.support,
      );

      const otherUser = await orchestrator.createUser({
        username: "otherUserToSupportChange",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "otherUsername",
            email: "otherUsername@gwalchmei.com.br",
            password: "newpassword",
            cpf: cpf.generate(false),
            phone: "12345678901",
            address: "Rua tal, cidade Tal",
            notes: "lorem ipsum",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:user".',
        status_code: 403,
      });
    });
  });
});
