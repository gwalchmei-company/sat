import database from "infra/database";
import { ValidationError, NotFoundError } from "infra/errors";
import { validate as isValidUuid } from "uuid";
import device from "models/device";
import user from "models/user";
import customerOrder from "models/customer-order";

const RENTAL_STATUSES = [
  "pending",
  "active",
  "completed",
  "overdue",
  "canceled",
];

async function listAll() {
  const rentalsList = await runSelectQuery();
  return rentalsList;

  async function runSelectQuery() {
    const results = await database.query({
      text: `
        SELECT
          rentals.*,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf,
          users.phone
        FROM
          rentals
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rentals.deleted_at IS NULL
        ORDER BY
          rentals.created_at DESC
        ;`,
    });

    return results.rows;
  }
}

async function listByCustomerId(customerId) {
  const rentalsList = await runSelectQuery(customerId);
  return rentalsList;

  async function runSelectQuery(customerId) {
    const results = await database.query({
      text: `
        SELECT
          rentals.*,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf,
          users.phone
        FROM
          rentals
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rentals.customer_id = $1
        AND
          rentals.deleted_at IS NULL
        ORDER BY
          rentals.created_at DESC
        ;`,
      values: [customerId],
    });

    return results.rows;
  }
}

async function findOneById(rentalId) {
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

  const rentalFound = await runSelectQuery(rentalId);

  if (!rentalFound) {
    throw new NotFoundError({
      message: "O aluguel não foi encontrado.",
      action: "Verifique o id informado e tente novamente.",
    });
  }

  return rentalFound;

  async function runSelectQuery(rentalId) {
    const results = await database.query({
      text: `
        SELECT
          rentals.*,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf,
          users.phone
        FROM
          rentals
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rentals.id = $1
        AND
          rentals.deleted_at IS NULL
        ;`,
      values: [rentalId],
    });

    return results.rows[0];
  }
}

async function create(rentalObject) {
  await validationFields(rentalObject);
  const createdRental = await runInsertQuery(rentalObject);
  return createdRental;

  async function runInsertQuery(rentalObject) {
    const rentalCreated = await database.query({
      text: `
      INSERT INTO rentals
        (device_id, customer_id, customer_order_id, start_date, end_date, status, notes, location_refer, lat, lng)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        *
      ;`,
      values: [
        rentalObject.device_id,
        rentalObject.customer_id,
        rentalObject.customer_order_id,
        rentalObject.start_date,
        rentalObject.end_date,
        rentalObject.status,
        rentalObject.notes,
        rentalObject.location_refer,
        rentalObject.lat,
        rentalObject.lng,
      ],
    });

    return rentalCreated.rows[0];
  }

  async function validationFields(rentalObject) {
    if (!rentalObject.status) {
      rentalObject.status = "pending";
    }

    if (!rentalObject.device_id) {
      throw new ValidationError({
        message: "O id do dispositivo não foi encontrado ou é inválido.",
        action: "Verifique o id do dispositivo enviado e tente novamente.",
      });
    }

    if (!isValidUuid(rentalObject.device_id)) {
      throw new ValidationError({
        message: "O id do dispositivo não foi encontrado ou é inválido.",
        action: "Verifique o id do dispositivo enviado e tente novamente.",
      });
    }

    if (!rentalObject.customer_id) {
      throw new ValidationError({
        message: "O id do cliente não foi encontrado ou é inválido.",
        action: "Verifique o id do cliente enviado e tente novamente.",
      });
    }

    if (!isValidUuid(rentalObject.customer_id)) {
      throw new ValidationError({
        message: "O id do cliente não foi encontrado ou é inválido.",
        action: "Verifique o id do cliente enviado e tente novamente.",
      });
    }

    if (!rentalObject.start_date) {
      throw new ValidationError({
        message: "A data de início não foi informada.",
        action: "Informe a data de início e tente novamente.",
      });
    }

    if (!rentalObject.end_date) {
      throw new ValidationError({
        message: "A data de término não foi informada.",
        action: "Informe a data de término e tente novamente.",
      });
    }

    const startDate = new Date(rentalObject.start_date);
    const endDate = new Date(rentalObject.end_date);

    if (isNaN(startDate.getTime())) {
      throw new ValidationError({
        message: "A data de início não é válida.",
        action: "Informe uma data de início válida e tente novamente.",
      });
    }

    if (isNaN(endDate.getTime())) {
      throw new ValidationError({
        message: "A data de término não é válida.",
        action: "Informe uma data de término válida e tente novamente.",
      });
    }

    if (endDate <= startDate) {
      throw new ValidationError({
        message: "A data de término deve ser posterior à data de início.",
        action: "Verifique as datas e tente novamente.",
      });
    }

    if (!RENTAL_STATUSES.includes(rentalObject.status)) {
      throw new ValidationError({
        message: `O status "${rentalObject.status}" não é válido.`,
        action: `Use um dos status válidos: ${RENTAL_STATUSES.join(", ")}.`,
      });
    }

    await device.findOneById(rentalObject.device_id);
    await user.findOneById(rentalObject.customer_id);

    if (rentalObject.customer_order_id) {
      await customerOrder.findOneById(rentalObject.customer_order_id);
    }

    // Validar conflito de períodos
    await validateDeviceAvailability(
      rentalObject.device_id,
      rentalObject.start_date,
      rentalObject.end_date,
    );
  }

  async function validateDeviceAvailability(deviceId, startDate, endDate) {
    const conflictingRentals = await database.query({
      text: `
        SELECT
          id, start_date, end_date, status
        FROM
          rentals
        WHERE
          device_id = $1
        AND
          deleted_at IS NULL
        AND
          status NOT IN ('completed', 'canceled')
        AND
          (
            (start_date <= $2 AND end_date > $2)
            OR
            (start_date < $3 AND end_date >= $3)
            OR
            (start_date >= $2 AND end_date <= $3)
          )
      `,
      values: [deviceId, startDate, endDate],
    });

    if (conflictingRentals.rows.length > 0) {
      const conflict = conflictingRentals.rows[0];
      throw new ValidationError({
        message:
          "Este dispositivo já possui um aluguel ativo para o período solicitado.",
        action: `O dispositivo está alugado de ${new Date(conflict.start_date).toLocaleDateString()} até ${new Date(conflict.end_date).toLocaleDateString()}.`,
      });
    }
  }
}

async function update(rentalId, rentalObject) {
  const currentRental = await findOneById(rentalId);
  await validateUpdateFields(rentalObject, currentRental);
  const rentalWithNewValues = { ...currentRental, ...rentalObject };

  const updatedRental = await runUpdateQuery(rentalWithNewValues);
  return updatedRental;

  async function runUpdateQuery(rentalObject) {
    const result = await database.query({
      text: `
        UPDATE 
          rentals
        SET
          device_id = $1,
          customer_id = $2,
          customer_order_id = $3,
          start_date = $4,
          end_date = $5,
          status = $6,
          notes = $7,
          location_refer = $8,
          lat = $9,
          lng = $10,
          updated_at = timezone('utc', now())
        WHERE id = $11
        RETURNING *
      `,
      values: [
        rentalObject.device_id,
        rentalObject.customer_id,
        rentalObject.customer_order_id,
        rentalObject.start_date,
        rentalObject.end_date,
        rentalObject.status,
        rentalObject.notes,
        rentalObject.location_refer,
        rentalObject.lat,
        rentalObject.lng,
        rentalObject.id,
      ],
    });

    return result.rows[0];
  }

  async function validateUpdateFields(rentalObject, currentRental) {
    if (!rentalObject || Object.keys(rentalObject).length === 0) {
      throw new ValidationError({
        message: "O corpo da requisição está vazio ou inválido.",
        action: "Verifique os dados enviados e tente novamente.",
      });
    }

    if (rentalObject.device_id !== undefined) {
      if (!isValidUuid(rentalObject.device_id)) {
        throw new ValidationError({
          message: "O id do dispositivo não é válido.",
          action: "Verifique o id do dispositivo enviado e tente novamente.",
        });
      }
      try {
        await device.findOneById(rentalObject.device_id);
      } catch (error) {
        throw new NotFoundError({
          message: "O dispositivo solicitado não foi encontrado no sistema.",
          action:
            "Verifique se o ID do dispositivo está correto e tente novamente.",
        });
      }
    }

    if (rentalObject.customer_id !== undefined) {
      if (!isValidUuid(rentalObject.customer_id)) {
        throw new ValidationError({
          message: "O id do cliente não é válido.",
          action: "Verifique o id do cliente enviado e tente novamente.",
        });
      }
      try {
        await user.findOneById(rentalObject.customer_id);
      } catch (error) {
        throw new NotFoundError({
          message: "O usuário informado não foi encontrado no sistema.",
          action:
            "Verifique se o ID do usuário está correto e tente novamente.",
        });
      }
    }

    if (rentalObject.customer_order_id !== undefined) {
      if (!isValidUuid(rentalObject.customer_order_id)) {
        throw new ValidationError({
          message: "O id do pedido não é válido.",
          action: "Verifique o id do pedido enviado e tente novamente.",
        });
      }
      await customerOrder.findOneById(rentalObject.customer_order_id);
    }

    if (rentalObject.start_date !== undefined) {
      const startDate = new Date(rentalObject.start_date);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError({
          message: "A data de início não é válida.",
          action: "Informe uma data de início válida e tente novamente.",
        });
      }
    }

    if (rentalObject.end_date !== undefined) {
      const endDate = new Date(rentalObject.end_date);
      if (isNaN(endDate.getTime())) {
        throw new ValidationError({
          message: "A data de término não é válida.",
          action: "Informe uma data de término válida e tente novamente.",
        });
      }
    }

    // Validar relação entre start_date e end_date
    const startDate =
      rentalObject.start_date !== undefined
        ? new Date(rentalObject.start_date)
        : new Date(currentRental.start_date);
    const endDate =
      rentalObject.end_date !== undefined
        ? new Date(rentalObject.end_date)
        : new Date(currentRental.end_date);

    if (endDate <= startDate) {
      throw new ValidationError({
        message: "A data de término deve ser posterior à data de início.",
        action: "Verifique as datas e tente novamente.",
      });
    }

    if (rentalObject.status !== undefined) {
      if (!RENTAL_STATUSES.includes(rentalObject.status)) {
        throw new ValidationError({
          message: `O status "${rentalObject.status}" não é válido.`,
          action: `Use um dos status válidos: ${RENTAL_STATUSES.join(", ")}.`,
        });
      }
    }

    // Validar conflito de períodos (se device_id, start_date ou end_date foram alterados)
    const deviceId =
      rentalObject.device_id !== undefined
        ? rentalObject.device_id
        : currentRental.device_id;

    if (
      rentalObject.device_id !== undefined ||
      rentalObject.start_date !== undefined ||
      rentalObject.end_date !== undefined
    ) {
      await validateDeviceAvailabilityForUpdate(
        currentRental.id,
        deviceId,
        startDate.toISOString(),
        endDate.toISOString(),
      );
    }
  }

  async function validateDeviceAvailabilityForUpdate(
    rentalId,
    deviceId,
    startDate,
    endDate,
  ) {
    const conflictingRentals = await database.query({
      text: `
        SELECT
          id, start_date, end_date, status
        FROM
          rentals
        WHERE
          device_id = $1
        AND
          id != $2
        AND
          deleted_at IS NULL
        AND
          status NOT IN ('completed', 'canceled')
        AND
          (
            (start_date <= $3 AND end_date > $3)
            OR
            (start_date < $4 AND end_date >= $4)
            OR
            (start_date >= $3 AND end_date <= $4)
          )
      `,
      values: [deviceId, rentalId, startDate, endDate],
    });

    if (conflictingRentals.rows.length > 0) {
      const conflict = conflictingRentals.rows[0];
      throw new ValidationError({
        message:
          "Este dispositivo já possui um aluguel ativo para o período solicitado.",
        action: `O dispositivo está alugado de ${new Date(conflict.start_date).toLocaleDateString()} até ${new Date(conflict.end_date).toLocaleDateString()}.`,
      });
    }
  }
}

async function remove(rentalId) {
  const rentalToDelete = await validateRental(rentalId);
  await runDeleteQuery(rentalToDelete.id);

  async function runDeleteQuery(id) {
    await database.query({
      text: `
        UPDATE 
          rentals
        SET
          deleted_at = timezone('utc', now())
        WHERE id = $1
        `,
      values: [id],
    });
  }

  async function validateRental(rentalId) {
    const existingRental = await findOneById(rentalId);

    if (existingRental.deleted_at !== null) {
      throw new NotFoundError({
        message: "O aluguel não foi encontrado.",
        action: "Verifique o id informado e tente novamente.",
      });
    }

    return existingRental;
  }
}

export default Object.freeze({
  listAll,
  listByCustomerId,
  findOneById,
  create,
  update,
  remove,
});
