exports.up = (pgm) => {
  pgm.createTable("financial_expenses", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    description: {
      type: "text",
      notNull: true,
    },
    amount_in_cents: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    category: {
      type: "varchar(50)",
    },
    paid_at: {
      type: "timestamptz",
      notNull: false,
    },
    due_date_at: {
      type: "timestamptz",
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
  });
};

exports.down = false;
