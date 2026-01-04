exports.up = (pgm) => {
  pgm.createType("rental_status", [
    "pending",
    "active",
    "completed",
    "overdue",
    "canceled",
  ]);

  pgm.createTable("rentals", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    device_id: {
      type: "uuid",
      notNull: true,
      references: "devices(id)",
      onDelete: "RESTRICT",
    },
    customer_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    customer_order_id: {
      type: "uuid",
      notNull: false,
      references: "customer_order(id)",
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
      type: "rental_status",
      notNull: true,
      default: pgm.func("('pending'::rental_status)"),
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
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    deleted_at: {
      type: "timestamptz",
      notNull: false,
    },
  });

  pgm.createIndex("rentals", "device_id");
  pgm.createIndex("rentals", "customer_id");
  pgm.createIndex("rentals", "customer_order_id");
  pgm.createIndex("rentals", "status");
};

exports.down = false;
