exports.up = (pgm) => {
  pgm.createTable("devices", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    email_acc: {
      type: "varchar(254)",
      notNull: true,
    },

    utid_device: {
      type: "varchar(254)",
      notNull: true,
      unique: true,
    },

    serial_number: {
      type: "varchar(254)",
      notNull: true,
      unique: true,
    },

    serial_number_router: {
      type: "varchar(254)",
      notNull: true,
    },

    model: {
      type: "varchar(100)",
      notNull: true,
    },

    provider: {
      type: "varchar(254)",
    },

    tracker_code: {
      type: "varchar(254)",
    },

    status: {
      type: "varchar(60)",
      notNull: true,
      default: "available",
    },

    notes: {
      type: "text",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
