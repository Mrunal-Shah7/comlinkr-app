export function formatCurrency(amount: number, currency: "GBP" | "USD" = "GBP") {
  const symbol = currency === "GBP" ? "£" : "$";
  return symbol + amount.toLocaleString();
}
