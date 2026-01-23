import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/contracts/[id]", () => {
  describe("Anonymous user", () => {
    test("deny update when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny update when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("update contract status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "generated",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.status).toBe("generated");
      expect(responseBody.rental_id).toBe(rental.id);
    });

    test("update contract pdf_url and file_hash", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const pdfUrl = "https://example.com/contracts/contract-123.pdf";
      const fileHash = "a".repeat(64); // SHA256 hash tem 64 caracteres

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            pdf_url: pdfUrl,
            file_hash: fileHash,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.pdf_url).toBe(pdfUrl);
      expect(responseBody.file_hash).toBe(fileHash);
    });

    test("update contract signed_at and signed_by", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const signedAt = new Date().toISOString();

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
            signed_at: signedAt,
            signed_by: user.id,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.status).toBe("signed");
      expect(responseBody.signed_at).toBe(signedAt);
      expect(responseBody.signed_by).toBe(user.id);
    });

    test("update contract expires_at", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const expiresAt = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            expires_at: expiresAt,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.expires_at).toBe(expiresAt);
    });

    test("return 404 when contract does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${nonExistentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "O contrato informado não foi encontrado.",
      );
    });

    test("return 400 when contract id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const invalidId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${invalidId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe("O id do contrato não é válido.");
    });

    test("return 400 when no data is provided", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "Nenhum dado foi informado para atualização.",
      );
    });

    test("return 400 when status is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "invalid_status",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toContain("não é válido");
    });

    test("return 400 when file_hash length is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            file_hash: "short_hash",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "O hash do arquivo deve ter 64 caracteres (SHA256).",
      );
    });

    test("return 400 when signed_by is invalid uuid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            signed_by: "invalid-uuid",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "O id do usuário que assinou não é válido.",
      );
    });
  });

  describe("Manager user", () => {
    test("update contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "generated",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.status).toBe("generated");
    });
  });

  describe("Operator user", () => {
    test("deny update when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Support user", () => {
    test("deny update when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Status transitions validation", () => {
    test("deny transition from 'signed' to 'draft'", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "draft",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        'Não é possível alterar o status de "signed" para "draft".',
      );
      expect(responseBody.action).toBe(
        'Um contrato assinado só pode ser alterado para "canceled".',
      );
    });

    test("allow transition from 'signed' to 'canceled'", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "canceled",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("canceled");
    });

    test("deny transition from 'canceled' to any other status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "canceled",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "draft",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "Não é possível alterar o status de um contrato cancelado.",
      );
      expect(responseBody.action).toBe("Crie um novo contrato se necessário.");
    });

    test("allow normal status progression", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      // draft -> generated
      let response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "generated",
          }),
        },
      );

      expect(response.status).toBe(200);
      let responseBody = await response.json();
      expect(responseBody.status).toBe("generated");

      // generated -> sent
      response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "sent",
          }),
        },
      );

      expect(response.status).toBe(200);
      responseBody = await response.json();
      expect(responseBody.status).toBe("sent");

      // sent -> signed
      response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(200);
      responseBody = await response.json();
      expect(responseBody.status).toBe("signed");
    });
  });

  describe("Multiple fields update", () => {
    test("update multiple fields at once", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const pdfUrl = "https://example.com/contract.pdf";
      const fileHash = "b".repeat(64);
      const expiresAt = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const signedAt = new Date().toISOString();

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
            pdf_url: pdfUrl,
            file_hash: fileHash,
            expires_at: expiresAt,
            signed_at: signedAt,
            signed_by: user.id,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.status).toBe("signed");
      expect(responseBody.pdf_url).toBe(pdfUrl);
      expect(responseBody.file_hash).toBe(fileHash);
      expect(responseBody.expires_at).toBe(expiresAt);
      expect(responseBody.signed_at).toBe(signedAt);
      expect(responseBody.signed_by).toBe(user.id);
    });
  });

  describe("Deleted contracts", () => {
    test("return 404 when trying to update deleted contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        deleted_at: new Date().toISOString(),
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "signed",
          }),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "O contrato informado não foi encontrado.",
      );
    });
  });
});
