exports.up = (pgm) => {
  pgm.createTable("contracts", {
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
    contract_number: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "draft",
    },
    version: {
      type: "integer",
      notNull: true,
      default: 1,
    },
    pdf_url: {
      type: "text",
      notNull: false,
    },
    file_hash: {
      type: "varchar(64)",
      notNull: false,
    },
    expires_at: {
      type: "timestamptz",
      notNull: false,
    },
    previous_contract_id: {
      type: "uuid",
      notNull: false,
      references: "contracts(id)",
      onDelete: "SET NULL",
    },
    signed_at: {
      type: "timestamptz",
      notNull: false,
    },
    signed_by: {
      type: "uuid",
      notNull: false,
      references: "users(id)",
      onDelete: "RESTRICT",
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
    deleted_by: {
      type: "uuid",
      notNull: false,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
  });

  pgm.createIndex("contracts", "rental_id");
  pgm.createIndex("contracts", "contract_number");
  pgm.createIndex("contracts", "status");
  pgm.createIndex("contracts", "previous_contract_id");
  pgm.addConstraint("contracts", "status_check", {
    check: "status IN ('draft', 'generated', 'sent', 'signed', 'canceled')",
  });
};
