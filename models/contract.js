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
          deleted_by,
          cancel_reason,
          canceled_at,
          canceled_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
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
        contractObject.cancel_reason || null,
        contractObject.canceled_at || null,
        contractObject.canceled_by || null,
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

async function update(contractId, contractObject) {
  const currentContract = await findOneById(contractId);

  await validateContractUpdate(contractObject, currentContract);

  const updatedContract = await runUpdateQuery(contractId, contractObject);
  return updatedContract;

  async function validateContractUpdate(contractObject, currentContract) {
    if (!contractObject || Object.keys(contractObject).length === 0) {
      throw new ValidationError({
        message: "Nenhum dado foi informado para atualização.",
        action: "Informe os dados que deseja atualizar e tente novamente.",
      });
    }

    // Validar status
    if (contractObject.status !== undefined) {
      if (!CONTRACT_STATUS.includes(contractObject.status)) {
        throw new ValidationError({
          message: `O status "${contractObject.status}" não é válido.`,
          action: `Informe um dos status válidos: ${CONTRACT_STATUS.join(", ")}.`,
        });
      }

      // Validar transições de status
      const currentStatus = currentContract.status;
      const newStatus = contractObject.status;

      // Não pode voltar de "signed" para outros status (exceto "canceled")
      if (
        currentStatus === "signed" &&
        newStatus !== "signed" &&
        newStatus !== "canceled"
      ) {
        throw new ValidationError({
          message: `Não é possível alterar o status de "signed" para "${newStatus}".`,
          action: 'Um contrato assinado só pode ser alterado para "canceled".',
        });
      }

      // Não pode voltar de "canceled"
      if (currentStatus === "canceled" && newStatus !== "canceled") {
        throw new ValidationError({
          message: "Não é possível alterar o status de um contrato cancelado.",
          action: "Crie um novo contrato se necessário.",
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
  }

  async function runUpdateQuery(contractId, contractObject) {
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    const allowedFields = [
      "status",
      "pdf_url",
      "file_hash",
      "expires_at",
      "signed_at",
      "signed_by",
    ];

    for (const field of allowedFields) {
      if (contractObject[field] !== undefined) {
        updateFields.push(`${field} = $${paramCounter}`);
        values.push(contractObject[field]);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError({
        message: "Nenhum campo válido foi informado para atualização.",
        action: "Informe pelo menos um campo válido e tente novamente.",
      });
    }

    // Adicionar updated_at
    updateFields.push(`updated_at = NOW()`);

    values.push(contractId);

    const query = {
      text: `
        UPDATE contracts
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCounter}
        AND deleted_at IS NULL
        RETURNING *;
      `,
      values: values,
    };

    const result = await database.query(query);

    if (result.rowCount === 0) {
      throw new ValidationError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return result.rows[0];
  }
}

async function deleteContract(contractId, deletedByUserId) {
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

  if (!deletedByUserId) {
    throw new ValidationError({
      message: "O id do usuário que está deletando não foi informado.",
      action: "Informe o id do usuário e tente novamente.",
    });
  }

  if (!isValidUuid(deletedByUserId)) {
    throw new ValidationError({
      message: "O id do usuário que está deletando não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  await findOneById(contractId);

  const deletedContract = await runDeleteQuery(contractId, deletedByUserId);
  return deletedContract;

  async function runDeleteQuery(contractId, deletedByUserId) {
    const query = {
      text: `
        UPDATE contracts
        SET deleted_at = NOW(), deleted_by = $2
        WHERE id = $1
        AND deleted_at IS NULL
        RETURNING *;
      `,
      values: [contractId, deletedByUserId],
    };

    const result = await database.query(query);

    if (result.rowCount === 0) {
      throw new ValidationError({
        message: "O contrato informado não foi encontrado ou já foi deletado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return result.rows[0];
  }
}

async function sign(contractId, signedByUserId) {
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

  if (!signedByUserId) {
    throw new ValidationError({
      message: "O id do usuário que está assinando não foi informado.",
      action: "Informe o id do usuário e tente novamente.",
    });
  }

  if (!isValidUuid(signedByUserId)) {
    throw new ValidationError({
      message: "O id do usuário que está assinando não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const currentContract = await findOneById(contractId);

  validateContractCanBeSigned(currentContract);

  const signedContract = await runSignQuery(contractId, signedByUserId);
  return signedContract;

  function validateContractCanBeSigned(currentContract) {
    const allowedStatuses = ["draft", "generated", "sent"];

    if (!allowedStatuses.includes(currentContract.status)) {
      throw new ValidationError({
        message: `Não é possível assinar um contrato com status "${currentContract.status}".`,
        action: `O contrato deve estar em um dos seguintes status: ${allowedStatuses.join(", ")}.`,
      });
    }

    if (currentContract.signed_at) {
      throw new ValidationError({
        message: "Este contrato já foi assinado.",
        action: "Não é possível assinar um contrato que já foi assinado.",
      });
    }
  }

  async function runSignQuery(contractId, signedByUserId) {
    const query = {
      text: `
        UPDATE contracts
        SET 
          status = 'signed',
          signed_at = NOW(),
          signed_by = $2,
          updated_at = NOW()
        WHERE id = $1
        AND deleted_at IS NULL
        RETURNING *;
      `,
      values: [contractId, signedByUserId],
    };

    const result = await database.query(query);

    if (result.rowCount === 0) {
      throw new ValidationError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return result.rows[0];
  }
}

async function cancel(contractId, canceledByUserId, cancelOptions = {}) {
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

  if (!canceledByUserId) {
    throw new ValidationError({
      message: "O id do usuário que está cancelando não foi informado.",
      action: "Informe o id do usuário e tente novamente.",
    });
  }

  if (!isValidUuid(canceledByUserId)) {
    throw new ValidationError({
      message: "O id do usuário que está cancelando não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const currentContract = await findOneById(contractId);

  validateContractCanBeCanceled(currentContract, cancelOptions);

  if (cancelOptions.canceled_at) {
    const canceledContract = await runScheduleCancelQuery(
      contractId,
      canceledByUserId,
      cancelOptions.canceled_at,
      cancelOptions.cancel_reason,
    );
    return canceledContract;
  }

  const canceledContract = await runCancelQuery(
    contractId,
    canceledByUserId,
    cancelOptions.cancel_reason,
  );
  return canceledContract;

  function validateContractCanBeCanceled(currentContract, cancelOptions) {
    const allowedStatuses = ["draft", "signed"];

    if (!allowedStatuses.includes(currentContract.status)) {
      throw new ValidationError({
        message: `Não é possível cancelar um contrato com status "${currentContract.status}".`,
        action: `O contrato deve estar em um dos seguintes status: ${allowedStatuses.join(", ")}.`,
      });
    }

    if (currentContract.status === "canceled") {
      throw new ValidationError({
        message: "Este contrato já foi cancelado.",
        action: "Não é possível cancelar um contrato que já foi cancelado.",
      });
    }

    if (cancelOptions.canceled_at) {
      if (currentContract.status !== "signed") {
        throw new ValidationError({
          message:
            "Só é possível agendar cancelamento para contratos assinados (ativos).",
          action: "Para contratos em draft, faça o cancelamento imediato.",
        });
      }

      const cancelAtDate = new Date(cancelOptions.canceled_at);
      const now = new Date();

      if (isNaN(cancelAtDate.getTime())) {
        throw new ValidationError({
          message: "A data de cancelamento não é válida.",
          action: "Informe uma data válida no formato ISO 8601.",
        });
      }

      if (cancelAtDate <= now) {
        throw new ValidationError({
          message: "A data de cancelamento deve ser no futuro.",
          action: "Informe uma data futura para agendar o cancelamento.",
        });
      }
    }
  }

  async function runScheduleCancelQuery(
    contractId,
    canceledByUserId,
    canceledAt,
    cancelReason,
  ) {
    const query = {
      text: `
        UPDATE contracts
        SET 
          canceled_at = $2,
          canceled_by = $3,
          cancel_reason = $4,
          updated_at = NOW()
        WHERE id = $1
        AND deleted_at IS NULL
        RETURNING *;
      `,
      values: [contractId, canceledAt, canceledByUserId, cancelReason || null],
    };

    const result = await database.query(query);

    if (result.rowCount === 0) {
      throw new ValidationError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return result.rows[0];
  }

  async function runCancelQuery(contractId, canceledByUserId, cancelReason) {
    const query = {
      text: `
        UPDATE contracts
        SET 
          status = 'canceled',
          canceled_at = NOW(),
          canceled_by = $2,
          cancel_reason = $3,
          updated_at = NOW()
        WHERE id = $1
        AND deleted_at IS NULL
        RETURNING *;
      `,
      values: [contractId, canceledByUserId, cancelReason || null],
    };

    const result = await database.query(query);

    if (result.rowCount === 0) {
      throw new ValidationError({
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
      });
    }

    return result.rows[0];
  }
}

const contract = {
  create,
  listAll,
  listByCustomerId,
  findOneById,
  findOneByIdAndCustomerId,
  update,
  delete: deleteContract,
  sign,
  cancel,
};

export default contract;
