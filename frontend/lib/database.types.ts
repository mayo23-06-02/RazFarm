// Hand-authored to match supabase/migrations/0001_module_a_tenant_access.sql.
// Regenerate against a live project once one exists:
//   npx supabase gen types typescript --local > lib/database.types.ts

export type MemberRole = "chairman" | "treasurer" | "secretary" | "supervisor" | "member" | "accountant";
export type CommitteeRole = "chairman" | "treasurer" | "secretary";
export type MembershipStatus = "active" | "revoked" | "expired";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type MillName = "ubombo" | "mhlume" | "simunye" | "other";

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          mill: MillName;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          mill?: MillName;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          season_start: string | null;
          season_end: string | null;
          vat_registered: boolean;
          logo_path: string | null;
          currency: "SZL";
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          season_start?: string | null;
          season_end?: string | null;
          vat_registered?: boolean;
          logo_path?: string | null;
          currency?: "SZL";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_settings"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          is_mega_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          is_mega_admin?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: MemberRole;
          status: MembershipStatus;
          term_start: string | null;
          term_end: string | null;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: MemberRole;
          status?: MembershipStatus;
          term_start?: string | null;
          term_end?: string | null;
          joined_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          tenant_id: string;
          token: string;
          name: string;
          phone: string | null;
          email: string | null;
          role: MemberRole;
          term_start: string | null;
          term_end: string | null;
          status: InviteStatus;
          invited_by: string | null;
          accepted_by: string | null;
          accepted_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          token?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          role: MemberRole;
          term_start?: string | null;
          term_end?: string | null;
          status?: InviteStatus;
          invited_by?: string | null;
          accepted_by?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          tenant_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before?: Record<string, unknown> | null;
          after?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      register_association: {
        Args: { p_name: string; p_slug: string; p_mill: MillName };
        Returns: string;
      };
      accept_invite: {
        Args: { p_token: string };
        Returns: { tenant_id: string; tenant_name: string; role: MemberRole };
      };
      preview_invite: {
        Args: { p_token: string };
        Returns:
          | { valid: true; tenant_name: string; name: string; role: MemberRole; expires_at: string }
          | { valid: false; reason: string; tenant_name?: string };
      };
    };
    Enums: {
      member_role: MemberRole;
      committee_role: CommitteeRole;
      membership_status: MembershipStatus;
      invite_status: InviteStatus;
      mill_name: MillName;
    };
  };
}
