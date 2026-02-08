// ─── Format HH:MM time to readable AM/PM ────────────────────────
export const formatTime = (time: string): string => {
  const [h] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:00 ${ampm}`;
};

// ─── Get time-based greeting ─────────────────────────────────────
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Format ISO date to readable string ──────────────────────────
export const formatDigestDate = (isoDate: string): string => {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Capitalize first letter ─────────────────────────────────────
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);
