const authorizedIds = (process.env.AUTHORIZED_USER_IDS || "")
  .split(",").map((id) => id.trim()).filter(Boolean);
export function isAuthorized(userId) {
  return authorizedIds.includes(userId);
}
