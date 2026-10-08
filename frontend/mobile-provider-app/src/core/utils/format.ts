export function formatRupees(amountPaise: number | undefined | null) {
  if (amountPaise === undefined || amountPaise === null) return "--";
  return `₹${amountPaise.toLocaleString("en-IN")}`;
}

export function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
