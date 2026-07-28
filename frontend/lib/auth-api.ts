import { createClient } from "@/lib/supabase/client";
import { isEmail, normalizePhone } from "@/lib/validators/auth";

const LATENCY_MS = 800;
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email/phone or password is incorrect. Check it and try again.";
  }
  if (m.includes("expired") || (m.includes("invalid") && (m.includes("otp") || m.includes("token")))) {
    return "That code has expired. Request a new one.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with that phone or email already exists.";
  }
  if (m.includes("signups not allowed") || m.includes("user not found")) {
    return "We couldn't find an account with that email or phone. Check it, or create a new account.";
  }
  if (m.includes("phone signups are disabled") || m.includes("phone provider")) {
    return "Phone sign-up isn't turned on for this association yet. Contact support.";
  }
  return message;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface LoginResult {
  userId: string;
  fullName: string;
}

export async function login({ identifier, password }: LoginInput): Promise<LoginResult> {
  const supabase = createClient();
  const credentials = isEmail(identifier)
    ? { email: identifier.trim(), password }
    : { phone: normalizePhone(identifier), password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw new AuthApiError(friendlyError(error.message));
  return {
    userId: data.user?.id ?? "",
    fullName: (data.user?.user_metadata?.full_name as string | undefined) ?? "Member",
  };
}

export interface RegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  associationName: string;
  password: string;
}

export interface RegisterResult {
  userId: string;
  phone: string;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const supabase = createClient();
  const phone = normalizePhone(input.phone);
  const { data, error } = await supabase.auth.signUp({
    phone,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        association_name: input.associationName,
        // TODO: email is stored as metadata only until a verified-email
        // flow (supabase.auth.updateUser({ email })) is wired up — phone
        // is the primary, verified identity for this signUp call.
        email: input.email || null,
      },
    },
  });
  if (error) throw new AuthApiError(friendlyError(error.message));
  return { userId: data.user?.id ?? "", phone };
}

export interface RequestResetInput {
  identifier: string;
}

export async function requestReset({
  identifier,
}: RequestResetInput): Promise<{ sent: true; identifier: string }> {
  const supabase = createClient();
  const normalized = isEmail(identifier) ? identifier.trim() : normalizePhone(identifier);
  const { error } = isEmail(identifier)
    ? await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: false } })
    : await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: false } });
  if (error) throw new AuthApiError(friendlyError(error.message));
  return { sent: true, identifier: normalized };
}

export interface VerifyOtpInput {
  identifier: string;
  code: string;
  flow: "reset" | "signup";
}

export async function verifyOtp({ identifier, code }: VerifyOtpInput): Promise<{ verified: true }> {
  const supabase = createClient();
  const { error } = isEmail(identifier)
    ? await supabase.auth.verifyOtp({ email: identifier.trim(), token: code, type: "email" })
    : await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token: code, type: "sms" });
  if (error) throw new AuthApiError(friendlyError(error.message));
  return { verified: true };
}

export interface ResendOtpInput {
  identifier: string;
  flow: "reset" | "signup";
}

export async function resendOtp({ identifier, flow }: ResendOtpInput): Promise<{ sent: true }> {
  if (flow === "reset") {
    await requestReset({ identifier });
    return { sent: true };
  }

  const supabase = createClient();
  const { error } = isEmail(identifier)
    ? await supabase.auth.resend({ type: "signup", email: identifier.trim() })
    : await supabase.auth.resend({ type: "sms", phone: normalizePhone(identifier) });
  if (error) throw new AuthApiError(friendlyError(error.message));
  return { sent: true };
}

export interface ResetPasswordInput {
  password: string;
}

export async function resetPassword({ password }: ResetPasswordInput): Promise<{ reset: true }> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AuthApiError(friendlyError(error.message));
  await supabase.auth.signOut();
  return { reset: true };
}

// TODO: invites depend on a tenant/invite table that doesn't exist in the
// database yet, so these two stay mocked. Once an `invites` table + RLS
// policy exist, replace getInvite with a real lookup and have acceptInvite
// call supabase.auth.signUp (or an admin.inviteUserByEmail-issued link,
// verified server-side) using the invite's stored contact + role.
export interface InviteDetails {
  associationName: string;
  role: string;
  invitedName?: string;
}

export async function getInvite(token: string): Promise<InviteDetails> {
  await delay(null);
  void token;
  return {
    associationName: "Lubombo Grower's Co-operative",
    role: "Supervisor",
  };
}

export interface AcceptInviteInput {
  token: string;
  fullName: string;
  password: string;
}

export async function acceptInvite(input: AcceptInviteInput): Promise<{ userId: string }> {
  await delay(null);
  void input;
  return { userId: "mock-user-invited" };
}
