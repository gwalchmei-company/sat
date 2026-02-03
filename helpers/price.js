export function formatPrice(priceInCents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100);
}

export function unformatPrice(formattedPrice) {
  return Math.round(
    Number(formattedPrice.replace(/[^0-9,-]/g, "").replace(",", ".")) * 100,
  );
}
