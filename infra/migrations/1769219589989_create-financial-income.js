exports.up = (pgm) => {
  pgm.createTable("financial_income", {
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
    amount_in_cents: {
      type: "integer",
      notNull: true,
    },
    payment_method: {
      type: "varchar(50)",
      notNull: true,
    },
    received_at: {
      type: "timestamptz",
      notNull: true,
    },
    reference_date: {
      type: "timestamptz",
      notNull: false,
    },
    description: {
      type: "text",
      notNull: false,
    },
    installment_number: {
      type: "integer",
      notNull: false,
    },
    total_installments: {
      type: "integer",
      notNull: false,
    },
    transaction_id: {
      type: "varchar(255)",
      notNull: false,
    },
    notes: {
      type: "text",
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

  pgm.createIndex("financial_income", "rental_id");
  pgm.createIndex("financial_income", "received_at");
  pgm.createIndex("financial_income", ["deleted_at"]);
};

exports.down = false;
