exports.up = (pgm) => {
  pgm.createType("customer_order_status", [
    "pending",
    "approved",
    "rejected",
    "completed",
    "canceled",
  ]);

  pgm.createTable("customer_order", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    start_date: {
      type: "timestamptz",
      notNull: true,
    },
    end_date: {
      type: "timestamptz",
      notNull: true,
    },
    status: {
      type: "customer_order_status",
      notNull: true,
      default: pgm.func("('pending'::customer_order_status)"),
    },
    notes: {
      type: "text",
      notNull: false,
    },
    location_refer: {
      type: "text",
      notNull: false,
    },
    lat: {
      type: "float8",
      notNull: false,
    },
    lng: {
      type: "float8",
      notNull: false,
    },
    created_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
