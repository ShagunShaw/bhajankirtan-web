// Render/AWS servers run in UTC, so "today" must be computed in IST explicitly.
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export const istDate = (offsetDays = 0) =>
  fmt.format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));