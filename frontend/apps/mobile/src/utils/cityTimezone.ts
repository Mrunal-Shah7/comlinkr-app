// src/utils/cityTimezone.ts
//
// The IANA time zone of the cities the app knows, for showing a city's own time (Explore's greeting) and for
// deciding whether a business there is open when its owner gave no time zone. Unknown cities return undefined:
// the phone's clock is not the city's clock, so callers must not guess.

const CITY_TZ: Record<string, string> = {
  "New York": "America/New_York", "New York City": "America/New_York",
  "Los Angeles": "America/Los_Angeles", "Chicago": "America/Chicago",
  "Houston": "America/Chicago", "Phoenix": "America/Phoenix",
  "Philadelphia": "America/New_York", "San Antonio": "America/Chicago",
  "San Diego": "America/Los_Angeles", "Dallas": "America/Chicago",
  "San Jose": "America/Los_Angeles", "Austin": "America/Chicago",
  "Miami": "America/New_York", "Atlanta": "America/New_York",
  "Seattle": "America/Los_Angeles", "Denver": "America/Denver",
  "Boston": "America/New_York", "Nashville": "America/Chicago",
  "London": "Europe/London", "Manchester": "Europe/London",
  "Birmingham": "Europe/London", "Leeds": "Europe/London",
  "Glasgow": "Europe/London", "Bristol": "Europe/London",
  "Toronto": "America/Toronto", "Vancouver": "America/Vancouver",
  "Montreal": "America/Toronto", "Calgary": "America/Edmonton",
  "Dubai": "Asia/Dubai", "Abu Dhabi": "Asia/Dubai",
  "Sydney": "Australia/Sydney", "Melbourne": "Australia/Melbourne",
  "Brisbane": "Australia/Brisbane", "Perth": "Australia/Perth",
  "Paris": "Europe/Paris", "Berlin": "Europe/Berlin",
  "Amsterdam": "Europe/Amsterdam", "Madrid": "Europe/Madrid",
  "Rome": "Europe/Rome", "Lagos": "Africa/Lagos",
  "Nairobi": "Africa/Nairobi", "Accra": "Africa/Accra",
  "Mumbai": "Asia/Kolkata", "Delhi": "Asia/Kolkata",
  "Bangalore": "Asia/Kolkata", "Singapore": "Asia/Singapore",
  "Kuala Lumpur": "Asia/Kuala_Lumpur", "Jakarta": "Asia/Jakarta",
  "Tokyo": "Asia/Tokyo", "Seoul": "Asia/Seoul",
  "Hong Kong": "Asia/Hong_Kong", "Shanghai": "Asia/Shanghai",
  "Beijing": "Asia/Shanghai",
};

export function cityTimezone(city?: string | null): string | undefined {
  const key = city?.trim();
  return key ? CITY_TZ[key] : undefined;
}
