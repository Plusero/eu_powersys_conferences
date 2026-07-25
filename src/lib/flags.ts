/** ISO 3166-1 alpha-2 codes for countries appearing in conference locations. */
const COUNTRY_TO_ISO: Record<string, string> = {
  albania: "AL",
  andorra: "AD",
  australia: "AU",
  austria: "AT",
  belarus: "BY",
  belgium: "BE",
  "bosnia and herzegovina": "BA",
  bulgaria: "BG",
  croatia: "HR",
  cyprus: "CY",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  estonia: "EE",
  finland: "FI",
  france: "FR",
  germany: "DE",
  greece: "GR",
  hungary: "HU",
  iceland: "IS",
  ireland: "IE",
  italy: "IT",
  latvia: "LV",
  liechtenstein: "LI",
  lithuania: "LT",
  luxembourg: "LU",
  malta: "MT",
  moldova: "MD",
  monaco: "MC",
  montenegro: "ME",
  netherlands: "NL",
  "north macedonia": "MK",
  norway: "NO",
  poland: "PL",
  portugal: "PT",
  romania: "RO",
  russia: "RU",
  serbia: "RS",
  slovakia: "SK",
  slovenia: "SI",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  turkey: "TR",
  ukraine: "UA",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
};

function titleCaseCountry(key: string): string {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Infer country from a location string (e.g. "Lisbon, Portugal (...)" → Portugal). */
export function extractCountryFromLocation(location: string): string | null {
  const withoutParens = location.replace(/\s*\([^)]*\)/g, "").trim();
  const segments = withoutParens.split(",").map((s) => s.trim()).filter(Boolean);

  if (segments.length === 0) return null;

  const lastKey = segments[segments.length - 1].toLowerCase();
  if (COUNTRY_TO_ISO[lastKey]) return titleCaseCountry(lastKey);

  const lower = withoutParens.toLowerCase();
  const names = Object.keys(COUNTRY_TO_ISO).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (lower.includes(name)) return titleCaseCountry(name);
  }

  return null;
}

export function countryNameToIso(countryName: string): string | null {
  return COUNTRY_TO_ISO[countryName.trim().toLowerCase()] ?? null;
}

/** PNG flag image (works on Windows; Unicode flag emojis often show as "IT", "PT", etc.). */
export function flagImageUrl(iso: string): string {
  return `https://flagcdn.com/24x18/${iso.toLowerCase()}.png`;
}

export function getLocationFlag(location: string | null): {
  iso: string;
  country: string;
  imageUrl: string;
} | null {
  if (!location) return null;
  const country = extractCountryFromLocation(location);
  if (!country) return null;
  const iso = countryNameToIso(country);
  if (!iso) return null;
  return { iso, country, imageUrl: flagImageUrl(iso) };
}
