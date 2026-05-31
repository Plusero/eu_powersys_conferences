const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso + "T12:00:00"));
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");

  if (start === end) return formatDate(start);

  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.getDate()} ${monthFormatter.format(endDate)} ${endDate.getFullYear()}`;
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  if (sameYear) {
    return `${monthFormatter.format(startDate)} ${startDate.getDate()} – ${monthFormatter.format(endDate)} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(iso + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineStatus(iso: string | null, now = new Date()): "past" | "soon" | "upcoming" | "none" {
  if (!iso) return "none";
  const days = daysUntil(iso, now);
  if (days < 0) return "past";
  if (days <= 30) return "soon";
  return "upcoming";
}

export function orgSlug(org: string): string {
  return org.toLowerCase().replace(/\s+/g, "-");
}
