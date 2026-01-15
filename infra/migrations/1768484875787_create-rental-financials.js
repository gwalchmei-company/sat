exports.up = (pgm) => {
  pgm.createTable("rental_financials", {
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
      unique: true,
    },
    daily_price_in_cents: {
      type: "integer",
      notNull: true,
    },
    total_price_in_cents: {
      type: "integer",
      notNull: true,
    },
    deposit_in_cents: {
      type: "integer",
      notNull: false,
      default: 0,
    },
    discount_in_cents: {
      type: "integer",
      notNull: false,
      default: 0,
    },
    final_price_in_cents: {
      type: "integer",
      notNull: true,
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

  pgm.createIndex("rental_financials", "rental_id");
};

exports.down = false;
