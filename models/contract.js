import database from "infra/database";
import { NotFoundError, ValidationError } from "infra/errors";
import { validate as isValidUuid } from "uuid";
import rental from "models/rental";

const CONTRACT_STATUS = ["draft", "generated", "sent", "signed", "canceled"];

async function create(contractObject) {
  await validateContractObject(contractObject);

  const contractCreated = await runInsertQuery(contractObject);
  return contractCreated;

  async function validateContractObject(contractObject) {
    if (!contractObject) {
      throw new ValidationError({
        message: "Os dados do contrato não foram informados.",
        action: "Informe os dados do contrato e tente novamente.",
      });
    }

    if (!contractObject.rental_id) {
      throw new ValidationError({
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
      });
    }

    if (!isValidUuid(contractObject.rental_id)) {
      throw new ValidationError({
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
      });
    }

    await rental.findOneById(contractObject.rental_id);

    if (!contractObject.contract_number) {
      throw new ValidationError({
        message: "O número do contrato não foi informado.",
        action: "Informe o número do contrato e tente novamente.",
      });
    }

    if (typeof contractObject.contract_number !== "string") {
      throw new ValidationError({
        message: "O número do contrato deve ser uma string.",
        action: "Informe um número válido e tente novamente.",
      });
    }

    if (contractObject.contract_number.length > 100) {
      throw new ValidationError({
        message: "O número do contrato não pode ter mais de 100 caracteres.",
        action: "Informe um número válido e tente novamente.",
      });
    }

    // Validar status
    if (contractObject.status) {
      if (!CONTRACT_STATUS.includes(contractObject.status)) {
        throw new ValidationError({
          message: `O status "${contractObject.status}" não é válido.`,
          action: `Informe um dos status válidos: ${CONTRACT_STATUS.join(", ")}.`,
        });
      }
    }

    // Validar version
    if (contractObject.version !== undefined) {
      if (typeof contractObject.version !== "number") {
        throw new ValidationError({
          message: "A versão do contrato deve ser um número.",
          action: "Informe uma versão válida e tente novamente.",
        });
      }

      if (contractObject.version < 1) {
        throw new ValidationError({
          message: "A versão do contrato deve ser maior ou igual a 1.",
          action: "Informe uma versão válida e tente novamente.",
        });
      }
    }

    // Validar pdf_url
    if (
      contractObject.pdf_url !== undefined &&
      contractObject.pdf_url !== null
    ) {
      if (typeof contractObject.pdf_url !== "string") {
        throw new ValidationError({
          message: "A URL do PDF deve ser uma string.",
          action: "Informe uma URL válida e tente novamente.",
        });
      }
    }

    // Validar file_hash
    if (
      contractObject.file_hash !== undefined &&
      contractObject.file_hash !== null
    ) {
      if (typeof contractObject.file_hash !== "string") {
        throw new ValidationError({
          message: "O hash do arquivo deve ser uma string.",
          action: "Informe um hash válido e tente novamente.",
        });
      }

      if (contractObject.file_hash.length !== 64) {
        throw new ValidationError({
          message: "O hash do arquivo deve ter 64 caracteres (SHA256).",
          action: "Informe um hash válido e tente novamente.",
        });
      }
    }

    // Validar expires_at
    if (
      contractObject.expires_at !== undefined &&
      contractObject.expires_at !== null
    ) {
      const expiresAtDate = new Date(contractObject.expires_at);
      if (isNaN(expiresAtDate.getTime())) {
        throw new ValidationError({
          message: "A data de expiração não é válida.",
          action: "Informe uma data válida e tente novamente.",
        });
      }
    }

    // Validar previous_contract_id
    if (
      contractObject.previous_contract_id !== undefined &&
      contractObject.previous_contract_id !== null
    ) {
      if (!isValidUuid(contractObject.previous_contract_id)) {
        throw new ValidationError({
          message: "O id do contrato anterior não é válido.",
          action: "Informe um id válido e tente novamente.",
        });
      }
    }

    // Validar signed_at
    if (
      contractObject.signed_at !== undefined &&
      contractObject.signed_at !== null
    ) {
      const signedAtDate = new Date(contractObject.signed_at);
      if (isNaN(signedAtDate.getTime())) {
        throw new ValidationError({
          message: "A data de assinatura não é válida.",
          action: "Informe uma data válida e tente novamente.",
        });
      }
    }

    // Validar signed_by
    if (
      contractObject.signed_by !== undefined &&
      contractObject.signed_by !== null
    ) {
      if (!isValidUuid(contractObject.signed_by)) {
        throw new ValidationError({
          message: "O id do usuário que assinou não é válido.",
          action: "Informe um id válido e tente novamente.",
        });
      }
    }

    // Validar deleted_by
    if (
      contractObject.deleted_by !== undefined &&
      contractObject.deleted_by !== null
    ) {
      if (!isValidUuid(contractObject.deleted_by)) {
        throw new ValidationError({
          message: "O id do usuário que deletou não é válido.",
          action: "Informe um id válido e tente novamente.",
        });
      }
    }
  }

  async function runInsertQuery(contractObject) {
    const query = {
      text: `
        INSERT INTO contracts (
          rental_id,
          contract_number,
          status,
          version,
          pdf_url,
          file_hash,
          expires_at,
          previous_contract_id,
          signed_at,
          signed_by,
          deleted_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING *;
      `,
      values: [
        contractObject.rental_id,
        contractObject.contract_number,
        contractObject.status || "draft",
        contractObject.version || 1,
        contractObject.pdf_url || null,
        contractObject.file_hash || null,
        contractObject.expires_at || null,
        contractObject.previous_contract_id || null,
        contractObject.signed_at || null,
        contractObject.signed_by || null,
        contractObject.deleted_by || null,
      ],
    };

    const result = await database.query(query);
    return result.rows[0];
  }
}

async function listAll() {
  const contractsList = await runSelectQuery();
  return contractsList;

  async function runSelectQuery() {
    const results = await database.query({
      text: `
        SELECT
          contracts.*,
          rentals.customer_id,
          rentals.device_id,
          devices.serial_number,
          devices.model AS device_model,
          users.username AS customer_username,
          users.email AS customer_email,
          signed_users.username AS signed_by_username
        FROM
          contracts
          INNER JOIN rentals ON rentals.id = contracts.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
          LEFT JOIN users AS signed_users ON signed_users.id = contracts.signed_by
        WHERE
          contracts.deleted_at IS NULL
        ORDER BY
          contracts.created_at DESC
        ;`,
    });

    return results.rows;
  }
}

async function listByCustomerId(customerId) {
  if (!customerId) {
    throw new ValidationError({
      message: "O id do cliente não foi informado.",
      action: "Informe o id do cliente e tente novamente.",
    });
  }

  if (!isValidUuid(customerId)) {
    throw new ValidationError({
      message: "O id do cliente não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const contractsList = await runSelectQuery(customerId);
  return contractsList;

  async function runSelectQuery(customerId) {
    const results = await database.query({
      text: `
        SELECT
          contracts.*,
          rentals.customer_id,
          rentals.device_id,
          devices.serial_number,
          devices.model AS device_model,
          users.username AS customer_username,
          users.email AS customer_email,
          signed_users.username AS signed_by_username
        FROM
          contracts
          INNER JOIN rentals ON rentals.id = contracts.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
          LEFT JOIN users AS signed_users ON signed_users.id = contracts.signed_by
        WHERE
          rentals.customer_id = $1
        AND
          contracts.deleted_at IS NULL
        ORDER BY
          contracts.created_at DESC
        ;`,
      values: [customerId],
    });

    return results.rows;
  }
}

async function findOneById(contractId) {
  if (!contractId) {
    throw new ValidationError({
      message: "O id do contrato não foi informado.",
      action: "Informe o id do contrato e tente novamente.",
    });
  }

  if (!isValidUuid(contractId)) {
    throw new ValidationError({
      message: "O id do contrato não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const contractFound = await runSelectQuery(contractId);
  return contractFound;

  async function runSelectQuery(contractId) {
    const results = await database.query({
      text: `
        SELECT
          contracts.*,
          rentals.customer_id,
          rentals.device_id,
          devices.serial_number,
          devices.model AS device_model,
          users.username AS customer_username,
          users.email AS customer_email,
          signed_users.username AS signed_by_username
        FROM
          contracts
          INNER JOIN rentals ON rentals.id = contracts.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
          LEFT JOIN users AS signed_users ON signed_users.id = contracts.signed_by
        WHERE
          contracts.id = $1
        AND
          contracts.deleted_at IS NULL
        ;`,
      values: [contractId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return results.rows[0];
  }
}

async function findOneByIdAndCustomerId(contractId, customerId) {
  if (!contractId) {
    throw new ValidationError({
      message: "O id do contrato não foi informado.",
      action: "Informe o id do contrato e tente novamente.",
    });
  }

  if (!isValidUuid(contractId)) {
    throw new ValidationError({
      message: "O id do contrato não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  if (!customerId) {
    throw new ValidationError({
      message: "O id do cliente não foi informado.",
      action: "Informe o id do cliente e tente novamente.",
    });
  }

  if (!isValidUuid(customerId)) {
    throw new ValidationError({
      message: "O id do cliente não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const contractFound = await runSelectQuery(contractId, customerId);
  return contractFound;

  async function runSelectQuery(contractId, customerId) {
    const results = await database.query({
      text: `
        SELECT
          contracts.*,
          rentals.customer_id,
          rentals.device_id,
          devices.serial_number,
          devices.model AS device_model,
          users.username AS customer_username,
          users.email AS customer_email,
          signed_users.username AS signed_by_username
        FROM
          contracts
          INNER JOIN rentals ON rentals.id = contracts.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
          LEFT JOIN users AS signed_users ON signed_users.id = contracts.signed_by
        WHERE
          contracts.id = $1
        AND
          rentals.customer_id = $2
        AND
          contracts.deleted_at IS NULL
        ;`,
      values: [contractId, customerId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return results.rows[0];
  }
}

const contract = {
  create,
  listAll,
  listByCustomerId,
  findOneById,
  findOneByIdAndCustomerId,
};

export default contract;
