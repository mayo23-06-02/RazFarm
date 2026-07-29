// Hand-authored to match supabase/migrations/0001_module_a_tenant_access.sql.
// Regenerate against a live project once one exists:
//   npx supabase gen types typescript --local > lib/database.types.ts

export type MemberRole = "chairman" | "treasurer" | "secretary" | "supervisor" | "member" | "accountant";
export type CommitteeRole = "chairman" | "treasurer" | "secretary";
export type MembershipStatus = "active" | "revoked" | "expired";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type MillName = "ubombo" | "mhlume" | "simunye" | "other";

// Module B: Members, Meetings & Governance (supabase/migrations/0002_members_governance.sql)
export type MemberStatus = "active" | "suspended" | "exited";
export type MeetingType = "agm" | "committee" | "special";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "apologies" | "absent";
export type ResolutionOutcome = "passed" | "failed";
export type MinutesStatus = "draft" | "submitted" | "approved";
export type AnnouncementAudience = "all" | "committee" | "custom";
export type DocumentCategory = "constitution" | "agreements" | "policies" | "titles" | "general";

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
          member_id: string | null;
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
          member_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          member_no: string;
          full_name: string;
          national_id: string | null;
          phone: string | null;
          email: string | null;
          join_date: string;
          shareholding: number;
          next_of_kin_name: string | null;
          next_of_kin_phone: string | null;
          next_of_kin_relationship: string | null;
          notes: string | null;
          status: MemberStatus;
          status_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          member_no: string;
          full_name: string;
          national_id?: string | null;
          phone?: string | null;
          email?: string | null;
          join_date?: string;
          shareholding?: number;
          next_of_kin_name?: string | null;
          next_of_kin_phone?: string | null;
          next_of_kin_relationship?: string | null;
          notes?: string | null;
          status?: MemberStatus;
          status_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          tenant_id: string;
          type: MeetingType;
          title: string;
          starts_at: string;
          venue: string | null;
          status: MeetingStatus;
          notify: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: MeetingType;
          title: string;
          starts_at: string;
          venue?: string | null;
          status?: MeetingStatus;
          notify?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meetings"]["Insert"]>;
        Relationships: [];
      };
      agenda_items: {
        Row: {
          id: string;
          meeting_id: string;
          position: number;
          item: string;
          presenter: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          position?: number;
          item: string;
          presenter?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agenda_items"]["Insert"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          meeting_id: string;
          member_id: string;
          status: AttendanceStatus;
          recorded_by: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          member_id: string;
          status?: AttendanceStatus;
          recorded_by?: string | null;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
      resolutions: {
        Row: {
          id: string;
          tenant_id: string;
          meeting_id: string;
          ref_no: string;
          title: string;
          body: string | null;
          moved_by: string | null;
          seconded_by: string | null;
          votes_for: number;
          votes_against: number;
          votes_abstain: number;
          outcome: ResolutionOutcome | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          meeting_id: string;
          ref_no: string;
          title: string;
          body?: string | null;
          moved_by?: string | null;
          seconded_by?: string | null;
          votes_for?: number;
          votes_against?: number;
          votes_abstain?: number;
          outcome?: ResolutionOutcome | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resolutions"]["Insert"]>;
        Relationships: [];
      };
      minutes: {
        Row: {
          meeting_id: string;
          body_markdown: string;
          status: MinutesStatus;
          submitted_by: string | null;
          submitted_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          updated_at: string;
        };
        Insert: {
          meeting_id: string;
          body_markdown?: string;
          status?: MinutesStatus;
          submitted_by?: string | null;
          submitted_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["minutes"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          body: string;
          audience: AnnouncementAudience;
          custom_member_ids: string[] | null;
          send_sms: boolean;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          body: string;
          audience?: AnnouncementAudience;
          custom_member_ids?: string[] | null;
          send_sms?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          category: DocumentCategory;
          name: string;
          path: string;
          size: number;
          mime_type: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category?: DocumentCategory;
          name: string;
          path: string;
          size?: number;
          mime_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
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
          | {
              valid: true;
              tenant_name: string;
              name: string;
              role: MemberRole;
              phone: string | null;
              email: string | null;
              expires_at: string;
            }
          | { valid: false; reason: string; tenant_name?: string };
      };
    };
    Enums: {
      member_role: MemberRole;
      committee_role: CommitteeRole;
      membership_status: MembershipStatus;
      invite_status: InviteStatus;
      mill_name: MillName;
      member_status: MemberStatus;
      meeting_type: MeetingType;
      meeting_status: MeetingStatus;
      attendance_status: AttendanceStatus;
      resolution_outcome: ResolutionOutcome;
      minutes_status: MinutesStatus;
      announcement_audience: AnnouncementAudience;
      document_category: DocumentCategory;
    };
  };
}
