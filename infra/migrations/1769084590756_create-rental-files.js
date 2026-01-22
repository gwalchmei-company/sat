exports.up = (pgm) => {
  pgm.createTable("rental_files", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    rental_id: {
      type: "uuid",
      notNull: true,
      references: "rentals(id)",
      onDelete: "RESTRICT",
    },
    type: {
      type: "varchar(50)",
      notNull: true,
    },
    file_url: {
      type: "text",
      notNull: true,
    },
    file_name: {
      type: "varchar(255)",
      notNull: false,
    },
    file_size: {
      type: "integer",
      notNull: false,
    },
    mime_type: {
      type: "varchar(100)",
      notNull: false,
    },
    description: {
      type: "text",
      notNull: false,
    },
    uploaded_by: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    deleted_at: {
      type: "timestamptz",
      notNull: false,
    },
    deleted_by: {
      type: "uuid",
      notNull: false,
      references: "users(id)",
      onDelete: "SET NULL",
    },
  });

  pgm.createIndex("rental_files", "rental_id");
  pgm.createIndex("rental_files", "type");
  pgm.createIndex("rental_files", ["rental_id", "type"]);

  pgm.addConstraint("rental_files", "rental_files_type_check", {
    check:
      "type IN ('DELIVERY_PHOTO', 'RETURN_PHOTO', 'CONTRACT', 'OTHER', 'DAMAGE_REPORT', 'PAYMENT_RECEIPT')",
  });
};

exports.down = false;
