import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

/**
 * Turn a raw Supabase/Postgres/network error into a plain-language, user-friendly
 * message. Pass a `fallback` describing the action (e.g. "Couldn't save your changes").
 * Use with showError: `showError(toFriendlyError(error, "Couldn't save your changes."))`.
 */
export const toFriendlyError = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  const raw = (typeof error === "object" && error && "message" in error ? String((error as any).message) : String(error || "")).toLowerCase();
  const code = (typeof error === "object" && error && "code" in error ? String((error as any).code) : "");

  if (!raw && !code) return fallback;
  if (raw.includes("duplicate key") || code === "23505") return "That already exists — please use a different name or value.";
  if (raw.includes("row-level security") || raw.includes("permission denied") || code === "42501") return "You don't have permission to do that. Try signing out and back in.";
  if (raw.includes("jwt") || raw.includes("expired") || raw.includes("not authenticated") || raw.includes("invalid token")) return "Your session expired. Please sign in again.";
  if (raw.includes("foreign key") || code === "23503") return "This is still linked to other items, so it can't be changed right now.";
  if (raw.includes("not-null") || raw.includes("violates not-null") || code === "23502") return "Some required information is missing. Please fill in all fields.";
  if (raw.includes("failed to fetch") || raw.includes("networkerror") || raw.includes("network request failed")) return "Couldn't reach the server. Check your connection and try again.";
  if (raw.includes("invalid login credentials")) return "That email or password doesn't match. Try again or reset your password.";
  if (raw.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (raw.includes("user already registered")) return "An account with this email already exists. Try signing in instead.";
  return fallback;
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
