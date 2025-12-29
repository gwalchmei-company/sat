import database from "infra/database";
import { ValidationError } from "infra/errors";

async function create(deviceInputValues) {
  await validateUniqueUTID(deviceInputValues.utid_device);
  await validateUniqueSerialNumber(deviceInputValues.serial_number);

  if (!deviceInputValues.email_acc) {
    throw new ValidationError({
      message:
        "Email vinculado a ACC do equipamento não foi informado ou inválido.",
      action: "Insira um email válido para realizar esta operação.",
    });
  }

  if (!deviceInputValues.utid_device) {
    throw new ValidationError({
      message: "UTID do equipamento não foi informado ou inválido.",
      action: "Insira um UTID válido para realizar esta operação.",
    });
  }

  if (!deviceInputValues.serial_number) {
    throw new ValidationError({
      message: "S/N não foi informado ou inválido.",
      action: "Insira um S/N válido para realizar esta operação.",
    });
  }

  if (!deviceInputValues.serial_number_router) {
    throw new ValidationError({
      message: "S/N do roteador não foi informado ou inválido.",
      action: "Insira um S/N do roteador válido para realizar esta operação.",
    });
  }

  if (!deviceInputValues.model) {
    throw new ValidationError({
      message: "Modelo do equipamento não foi informado.",
      action: "Insira o modelo para realizar esta operação.",
    });
  }

  if (deviceInputValues.status) {
    const isValid = ["available", "rented", "maintenance", "blocked"].includes(
      deviceInputValues.status,
    );

    if (!isValid) {
      throw new ValidationError({
        message: "Valor de status não é válido.",
        action:
          "Escolha entre 'available', 'rented', 'maintenance', 'blocked' para continuar.",
      });
    }
  }

  const newDevice = await runInsertQuery(deviceInputValues);
  return newDevice;

  async function runInsertQuery(deviceInputValues) {
    const results = await database.query({
      text: `
        INSERT INTO
          devices (email_acc, utid_device, serial_number, serial_number_router, model, provider, tracker_code, status, notes)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          *
        ;`,
      values: [
        deviceInputValues.email_acc,
        deviceInputValues.utid_device,
        deviceInputValues.serial_number,
        deviceInputValues.serial_number_router,
        deviceInputValues.model,
        deviceInputValues.provider,
        deviceInputValues.tracker_code,
        deviceInputValues.status,
        deviceInputValues.notes,
      ],
    });
    return results.rows[0];
  }
}

async function validateUniqueUTID(utidDevice) {
  const results = await database.query({
    text: `
      SELECT
        utid_device
      FROM
        devices
      WHERE
        LOWER(utid_device) = LOWER($1)
      ;`,
    values: [utidDevice],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O UTID informado já está sendo utilizado.",
      action: "Utilize outro UTID para realizar esta operação.",
    });
  }
}

async function validateUniqueSerialNumber(serialNumber) {
  const results = await database.query({
    text: `
      SELECT
        serial_number
      FROM
        devices
      WHERE
        LOWER(serial_number) = LOWER($1)
      ;`,
    values: [serialNumber],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O S/N informado já está sendo utilizado.",
      action: "Utilize outro S/N para realizar esta operação.",
    });
  }
}

const device = {
  create,
};

export default device;
