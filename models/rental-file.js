import database from "infra/database";
import { ValidationError, NotFoundError } from "infra/errors";
import { validate as isValidUuid } from "uuid";
import rental from "models/rental";

const FILE_TYPES = [
  "DELIVERY_PHOTO",
  "RETURN_PHOTO",
  "CONTRACT",
  "OTHER",
  "DAMAGE_REPORT",
  "PAYMENT_RECEIPT",
];

async function create(fileObject) {
  await validateFileObject(fileObject);

  const rentalFileCreated = await runInsertQuery(fileObject);
  return rentalFileCreated;

  async function validateFileObject(fileObject) {
    if (!fileObject) {
      throw new ValidationError({
        message: "Os dados do arquivo não foram informados.",
        action: "Informe os dados do arquivo e tente novamente.",
      });
    }

    if (!fileObject.rental_id) {
      throw new ValidationError({
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
      });
    }

    if (!isValidUuid(fileObject.rental_id)) {
      throw new ValidationError({
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
      });
    }

    await rental.findOneById(fileObject.rental_id);

    if (!fileObject.type) {
      throw new ValidationError({
        message: "O tipo do arquivo não foi informado.",
        action: "Informe o tipo do arquivo e tente novamente.",
      });
    }

    if (!FILE_TYPES.includes(fileObject.type)) {
      throw new ValidationError({
        message: `O tipo "${fileObject.type}" não é válido.`,
        action: `Informe um dos tipos válidos: ${FILE_TYPES.join(", ")}.`,
      });
    }

    if (!fileObject.file_url) {
      throw new ValidationError({
        message: "A URL do arquivo não foi informada.",
        action: "Informe a URL do arquivo e tente novamente.",
      });
    }

    if (typeof fileObject.file_url !== "string") {
      throw new ValidationError({
        message: "A URL do arquivo deve ser uma string.",
        action: "Informe uma URL válida e tente novamente.",
      });
    }

    if (!fileObject.uploaded_by) {
      throw new ValidationError({
        message: "O id do usuário que fez o upload não foi informado.",
        action: "Informe o id do usuário que fez o upload e tente novamente.",
      });
    }

    if (!isValidUuid(fileObject.uploaded_by)) {
      throw new ValidationError({
        message: "O id do usuário que fez o upload não é válido.",
        action: "Informe um id válido e tente novamente.",
      });
    }

    if (fileObject.file_size && typeof fileObject.file_size !== "number") {
      throw new ValidationError({
        message: "O tamanho do arquivo deve ser um número.",
        action: "Informe um tamanho válido e tente novamente.",
      });
    }

    if (
      fileObject.file_size &&
      (fileObject.file_size < 0 || fileObject.file_size > 52428800)
    ) {
      throw new ValidationError({
        message: "O tamanho do arquivo deve estar entre 0 e 50MB.",
        action: "Informe um tamanho válido e tente novamente.",
      });
    }
  }

  async function runInsertQuery(fileObject) {
    const query = {
      text: `
        INSERT INTO rental_files (
          rental_id,
          type,
          file_url,
          file_name,
          file_size,
          mime_type,
          description,
          uploaded_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        RETURNING *
        ;`,
      values: [
        fileObject.rental_id,
        fileObject.type,
        fileObject.file_url,
        fileObject.file_name || null,
        fileObject.file_size || null,
        fileObject.mime_type || null,
        fileObject.description || null,
        fileObject.uploaded_by,
      ],
    };

    const results = await database.query(query);
    return results.rows[0];
  }
}

async function findAllByRentalId(rentalId) {
  if (!rentalId) {
    throw new ValidationError({
      message: "O id do aluguel não foi informado.",
      action: "Informe o id do aluguel e tente novamente.",
    });
  }

  if (!isValidUuid(rentalId)) {
    throw new ValidationError({
      message: "O id do aluguel não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  await rental.findOneById(rentalId);

  const filesList = await runSelectQuery(rentalId);
  return filesList;

  async function runSelectQuery(rentalId) {
    const results = await database.query({
      text: `
        SELECT
          rental_files.*,
          users.username AS uploaded_by_username,
          deleted_users.username AS deleted_by_username
        FROM
          rental_files
          INNER JOIN users ON users.id = rental_files.uploaded_by
          LEFT JOIN users AS deleted_users ON deleted_users.id = rental_files.deleted_by
        WHERE
          rental_files.rental_id = $1
        AND
          rental_files.deleted_at IS NULL
        ORDER BY
          rental_files.created_at DESC
        ;`,
      values: [rentalId],
    });

    return results.rows;
  }
}

async function findOneById(fileId) {
  if (!fileId) {
    throw new ValidationError({
      message: "O id do arquivo não foi informado.",
      action: "Informe o id do arquivo e tente novamente.",
    });
  }

  if (!isValidUuid(fileId)) {
    throw new ValidationError({
      message: "O id do arquivo não é válido.",
      action: "Informe um id válido e tente novamente.",
    });
  }

  const fileFound = await runSelectQuery(fileId);

  if (!fileFound) {
    throw new NotFoundError({
      message: "O arquivo não foi encontrado.",
      action: "Verifique o id informado e tente novamente.",
    });
  }

  return fileFound;

  async function runSelectQuery(fileId) {
    const results = await database.query({
      text: `
        SELECT
          rental_files.*,
          users.username AS uploaded_by_username,
          deleted_users.username AS deleted_by_username
        FROM
          rental_files
          INNER JOIN users ON users.id = rental_files.uploaded_by
          LEFT JOIN users AS deleted_users ON deleted_users.id = rental_files.deleted_by
        WHERE
          rental_files.id = $1
        AND
          rental_files.deleted_at IS NULL
        ;`,
      values: [fileId],
    });

    return results.rows[0];
  }
}

async function deleteById(fileId, userId) {
  const fileFound = await findOneById(fileId);

  await runDeleteQuery(fileFound.id, userId);

  async function runDeleteQuery(fileId, userId) {
    await database.query({
      text: `
        UPDATE rental_files
        SET
          deleted_at = timezone('utc', now()),
          deleted_by = $2
        WHERE
          id = $1
        ;`,
      values: [fileId, userId],
    });
  }
}

export default Object.freeze({
  create,
  findAllByRentalId,
  findOneById,
  deleteById,
  FILE_TYPES,
});
