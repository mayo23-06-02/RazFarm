import { createClient } from "@/lib/supabase/client";
import { isEmail, normalizePhone } from "@/lib/validators/auth";
import { slugify } from "@/lib/slug";
import type { MillName } from "@/lib/database.types";

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

// Registration collects the association name up front, but the tenant can
// only be created once there's a verified, authenticated session — so this
// runs after OTP verification succeeds (see the "signup" flow in
// app/(auth)/verify/page.tsx), reading the name back from user metadata.
export interface CompleteRegistrationResult {
  tenantId: string;
}

export async function completeRegistration(): Promise<CompleteRegistrationResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const associationName = (user?.user_metadata?.association_name as string | undefined)?.trim();

  if (!associationName) {
    throw new AuthApiError("We couldn't find your association name. Please contact support.");
  }

  const baseSlug = slugify(associationName) || "association";
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.rpc("register_association", {
      p_name: associationName,
      p_slug: slug,
      p_mill: "other" as MillName,
    });
    if (!error) {
      await supabase.auth.refreshSession();
      return { tenantId: data as unknown as string };
    }
    lastError = error.message;
    if (!/duplicate|unique/i.test(error.message)) break;
  }

  throw new AuthApiError(friendlyError(lastError ?? "Couldn't set up your association. Try again."));
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
  flow: "reset" | "signup" | "invite";
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
  flow: "reset" | "signup" | "invite";
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

export interface InviteDetails {
  associationName: string;
  role: string;
  invitedName?: string;
  phone: string | null;
  email: string | null;
}

export async function getInvite(token: string): Promise<InviteDetails> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("preview_invite", { p_token: token });
  if (error) throw new AuthApiError(friendlyError(error.message));

  const result = data as unknown as
    | { valid: true; tenant_name: string; name: string; role: string; phone: string | null; email: string | null }
    | { valid: false; reason: string; tenant_name?: string };

  if (!result.valid) {
    throw new AuthApiError("This invite link is invalid or has expired.");
  }

  return {
    associationName: result.tenant_name,
    role: result.role,
    invitedName: result.name,
    phone: result.phone,
    email: result.email,
  };
}

export interface AcceptInviteInput {
  token: string;
  fullName: string;
  password: string;
  phone: string | null;
  email: string | null;
}

export interface AcceptInviteResult {
  identifier: string;
}

// Mirrors register(): signs up using the invite's own contact info (the
// visitor doesn't type it themselves — it's what the invite was sent to),
// then completeInviteAcceptance() links the membership after OTP verification.
export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
  const supabase = createClient();

  const { error } = input.email
    ? await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { full_name: input.fullName } },
      })
    : await supabase.auth.signUp({
        phone: normalizePhone(input.phone ?? ""),
        password: input.password,
        options: { data: { full_name: input.fullName } },
      });

  if (error) throw new AuthApiError(friendlyError(error.message));
  return { identifier: input.email ?? normalizePhone(input.phone ?? "") };
}

export async function completeInviteAcceptance(token: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw new AuthApiError(friendlyError(error.message));
  await supabase.auth.refreshSession();
}
