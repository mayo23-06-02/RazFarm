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

// Module D.1: Core Accounting (supabase/migrations/0004_finance_core.sql)
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type JournalEntryStatus = "draft" | "posted";

// Module D.1: Accounts Receivable (supabase/migrations/0005_accounts_receivable.sql)
export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "void";

// Module D.2: Deductions engine & member payout runs (supabase/migrations/0006_payout_runs.sql)
export type PayoutRunStatus = "draft" | "approved" | "paid";
export type MemberAccountEntryKind = "payout" | "advance" | "contribution" | "adjustment";

// Module D: Petty cash monitoring (supabase/migrations/0008_petty_cash.sql)
export type PettyCashTxType = "expense" | "replenishment";

// Module F.1: Inventory core (supabase/migrations/0009_inventory_core.sql)
export type InventoryItemCategory =
  | "fertilizer"
  | "chemical"
  | "seed_cane"
  | "equipment"
  | "vehicle"
  | "plant_equipment"
  | "other";
export type InventoryItemCondition = "excellent" | "good" | "fair" | "poor" | "out_of_service";
export type StockMovementType = "receipt" | "issue" | "adjustment";

// Module F.2: Purchase orders & goods-received notes (supabase/migrations/0010_purchase_orders.sql)
export type PurchaseOrderStatus = "draft" | "issued" | "received" | "billed" | "cancelled";
export type SupplierBillStatus = "open" | "paid";

// Module B: Cane Production & Field Management (supabase/migrations/0013_cane_production_fields.sql)
export type IrrigationType = "furrow" | "sprinkler" | "drip" | "rainfed";
export type FieldStatus = "active" | "fallow" | "harvesting" | "replanting" | "retired";
export type CropCycleType = "plant" | "ratoon";
export type CropCycleStatus = "growing" | "ready_to_harvest" | "harvesting" | "harvested" | "ploughed_out";
export type FieldActivityType = "land_prep" | "planting" | "fertilizer" | "herbicide" | "pesticide" | "ripener" | "irrigation" | "other";
export type HarvestPlanStatus = "planned" | "burn_scheduled" | "cutting" | "completed" | "cancelled";

// Module C: Mill Deliveries & Sucrose Tracking (supabase/migrations/0014_mill_deliveries.sql)
export type DeliveryStatus = "dispatched" | "result_captured" | "reconciled";

// Staff Management: employees & contractors (supabase/migrations/0015_staff_management.sql)
export type StaffEmploymentType = "permanent" | "casual";
export type StaffPayFrequency = "monthly" | "weekly";
export type StaffStatus = "active" | "suspended" | "terminated";
export type ContractorServiceType = "cutting" | "haulage" | "spraying" | "other";
export type ContractorRateBasis = "per_tonne" | "per_hectare" | "per_job" | "fixed";
export type ContractorStatus = "active" | "inactive";
export type ContractorJobStatus = "logged" | "billed" | "paid";

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
          season_quota_tonnes: number | null;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          season_start?: string | null;
          season_end?: string | null;
          vat_registered?: boolean;
          logo_path?: string | null;
          currency?: "SZL";
          season_quota_tonnes?: number | null;
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
      accounts: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          name: string;
          type: AccountType;
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          name: string;
          type: AccountType;
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          tenant_id: string;
          entry_no: string;
          entry_date: string;
          memo: string | null;
          status: JournalEntryStatus;
          created_by: string | null;
          posted_by: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          entry_no: string;
          entry_date?: string;
          memo?: string | null;
          status?: JournalEntryStatus;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["journal_entries"]["Insert"]>;
        Relationships: [];
      };
      journal_lines: {
        Row: {
          id: string;
          journal_entry_id: string;
          account_id: string;
          position: number;
          description: string | null;
          debit: number;
          credit: number;
        };
        Insert: {
          id?: string;
          journal_entry_id: string;
          account_id: string;
          position?: number;
          description?: string | null;
          debit?: number;
          credit?: number;
        };
        Update: Partial<Database["public"]["Tables"]["journal_lines"]["Insert"]>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string;
          invoice_no: string;
          issue_date: string;
          due_date: string;
          status: InvoiceStatus;
          vat_rate: number;
          notes: string | null;
          journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id: string;
          invoice_no: string;
          issue_date?: string;
          due_date?: string;
          status?: InvoiceStatus;
          vat_rate?: number;
          notes?: string | null;
          journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          position: number;
          description: string;
          quantity: number;
          unit_price: number;
          account_id: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          position?: number;
          description: string;
          quantity?: number;
          unit_price?: number;
          account_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_lines"]["Insert"]>;
        Relationships: [];
      };
      invoice_payments: {
        Row: {
          id: string;
          tenant_id: string;
          invoice_id: string;
          amount: number;
          paid_at: string;
          method: string | null;
          reference: string | null;
          deposit_account_id: string;
          journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          invoice_id: string;
          amount: number;
          paid_at?: string;
          method?: string | null;
          reference?: string | null;
          deposit_account_id: string;
          journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_payments"]["Insert"]>;
        Relationships: [];
      };
      credit_notes: {
        Row: {
          id: string;
          tenant_id: string;
          invoice_id: string;
          credit_no: string;
          amount: number;
          reason: string | null;
          revenue_account_id: string;
          issued_at: string;
          journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          invoice_id: string;
          credit_no: string;
          amount: number;
          reason?: string | null;
          revenue_account_id: string;
          issued_at?: string;
          journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_notes"]["Insert"]>;
        Relationships: [];
      };
      deduction_types: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          position: number;
          gl_account_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          position?: number;
          gl_account_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deduction_types"]["Insert"]>;
        Relationships: [];
      };
      payout_runs: {
        Row: {
          id: string;
          tenant_id: string;
          run_no: string;
          title: string;
          run_date: string;
          gross_pool: number;
          bank_account_id: string;
          status: PayoutRunStatus;
          journal_entry_id: string | null;
          created_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          run_no: string;
          title: string;
          run_date?: string;
          gross_pool: number;
          bank_account_id: string;
          status?: PayoutRunStatus;
          journal_entry_id?: string | null;
          created_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payout_runs"]["Insert"]>;
        Relationships: [];
      };
      payout_run_lines: {
        Row: {
          id: string;
          payout_run_id: string;
          member_id: string;
          gross_amount: number;
          net_amount: number;
          position: number;
        };
        Insert: {
          id?: string;
          payout_run_id: string;
          member_id: string;
          gross_amount?: number;
          net_amount?: number;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["payout_run_lines"]["Insert"]>;
        Relationships: [];
      };
      payout_deductions: {
        Row: {
          id: string;
          payout_run_line_id: string;
          deduction_type_id: string;
          amount: number;
        };
        Insert: {
          id?: string;
          payout_run_line_id: string;
          deduction_type_id: string;
          amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["payout_deductions"]["Insert"]>;
        Relationships: [];
      };
      member_account_entries: {
        Row: {
          id: string;
          tenant_id: string;
          member_id: string;
          entry_date: string;
          kind: MemberAccountEntryKind;
          description: string;
          amount: number;
          payout_run_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          member_id: string;
          entry_date?: string;
          kind: MemberAccountEntryKind;
          description: string;
          amount: number;
          payout_run_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["member_account_entries"]["Insert"]>;
        Relationships: [];
      };
      petty_cash_funds: {
        Row: {
          id: string;
          tenant_id: string;
          account_id: string;
          name: string;
          float_amount: number;
          custodian_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          account_id: string;
          name?: string;
          float_amount?: number;
          custodian_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["petty_cash_funds"]["Insert"]>;
        Relationships: [];
      };
      petty_cash_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          fund_id: string;
          tx_type: PettyCashTxType;
          tx_date: string;
          description: string | null;
          amount: number;
          category_account_id: string;
          receipt_ref: string | null;
          journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          fund_id: string;
          tx_type: PettyCashTxType;
          tx_date?: string;
          description?: string | null;
          amount: number;
          category_account_id: string;
          receipt_ref?: string | null;
          journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["petty_cash_transactions"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          tenant_id: string;
          sku: string;
          name: string;
          category: InventoryItemCategory;
          unit: string;
          reorder_level: number;
          quantity_on_hand: number;
          average_cost: number;
          default_supplier_id: string | null;
          is_active: boolean;
          storage_location: string | null;
          batch_no: string | null;
          expiry_date: string | null;
          max_stock_level: number | null;
          preferred_order_qty: number | null;
          serial_or_asset_no: string | null;
          purchase_date: string | null;
          condition: InventoryItemCondition | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          sku: string;
          name: string;
          category?: InventoryItemCategory;
          unit?: string;
          reorder_level?: number;
          quantity_on_hand?: number;
          average_cost?: number;
          default_supplier_id?: string | null;
          is_active?: boolean;
          storage_location?: string | null;
          batch_no?: string | null;
          expiry_date?: string | null;
          max_stock_level?: number | null;
          preferred_order_qty?: number | null;
          serial_or_asset_no?: string | null;
          purchase_date?: string | null;
          condition?: InventoryItemCondition | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inventory_items"]["Insert"]>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          movement_type: StockMovementType;
          quantity_delta: number;
          unit_cost: number;
          reference: string | null;
          journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          movement_type: StockMovementType;
          quantity_delta: number;
          unit_cost?: number;
          reference?: string | null;
          journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string;
          po_no: string;
          status: PurchaseOrderStatus;
          order_date: string;
          expected_date: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id: string;
          po_no: string;
          status?: PurchaseOrderStatus;
          order_date?: string;
          expected_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Insert"]>;
        Relationships: [];
      };
      purchase_order_lines: {
        Row: {
          id: string;
          purchase_order_id: string;
          position: number;
          item_id: string;
          quantity_ordered: number;
          quantity_received: number;
          unit_cost: number;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          position?: number;
          item_id: string;
          quantity_ordered: number;
          quantity_received?: number;
          unit_cost?: number;
        };
        Update: Partial<Database["public"]["Tables"]["purchase_order_lines"]["Insert"]>;
        Relationships: [];
      };
      goods_received_notes: {
        Row: {
          id: string;
          tenant_id: string;
          purchase_order_id: string;
          grn_no: string;
          received_date: string;
          reference: string | null;
          supplier_bill_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          purchase_order_id: string;
          grn_no: string;
          received_date?: string;
          reference?: string | null;
          supplier_bill_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goods_received_notes"]["Insert"]>;
        Relationships: [];
      };
      goods_received_lines: {
        Row: {
          id: string;
          goods_received_note_id: string;
          purchase_order_line_id: string;
          item_id: string;
          quantity_received: number;
          unit_cost: number;
          stock_movement_id: string | null;
        };
        Insert: {
          id?: string;
          goods_received_note_id: string;
          purchase_order_line_id: string;
          item_id: string;
          quantity_received: number;
          unit_cost?: number;
          stock_movement_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["goods_received_lines"]["Insert"]>;
        Relationships: [];
      };
      supplier_bills: {
        Row: {
          id: string;
          tenant_id: string;
          supplier_id: string;
          goods_received_note_id: string | null;
          bill_no: string;
          bill_date: string;
          amount: number;
          status: SupplierBillStatus;
          journal_entry_id: string | null;
          paid_journal_entry_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          supplier_id: string;
          goods_received_note_id?: string | null;
          bill_no: string;
          bill_date?: string;
          amount: number;
          status?: SupplierBillStatus;
          journal_entry_id?: string | null;
          paid_journal_entry_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["supplier_bills"]["Insert"]>;
        Relationships: [];
      };
      equipment_service_log: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          service_date: string;
          description: string;
          cost: number;
          performed_by: string | null;
          odometer_or_hours: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          service_date?: string;
          description: string;
          cost?: number;
          performed_by?: string | null;
          odometer_or_hours?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["equipment_service_log"]["Insert"]>;
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
      fields: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          member_id: string | null;
          hectares: number;
          variety: string | null;
          irrigation_type: IrrigationType;
          gps_lat: number | null;
          gps_lng: number | null;
          boundary_geojson: Record<string, unknown> | null;
          soil_notes: string | null;
          status: FieldStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          member_id?: string | null;
          hectares: number;
          variety?: string | null;
          irrigation_type?: IrrigationType;
          gps_lat?: number | null;
          gps_lng?: number | null;
          boundary_geojson?: Record<string, unknown> | null;
          soil_notes?: string | null;
          status?: FieldStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fields"]["Insert"]>;
        Relationships: [];
      };
      crop_cycles: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          cycle_type: CropCycleType;
          ratoon_number: number;
          status: CropCycleStatus;
          planted_date: string;
          expected_harvest_date: string | null;
          ploughed_out_date: string | null;
          area_hectares: number;
          yield_tonnes: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          cycle_type: CropCycleType;
          ratoon_number?: number;
          status?: CropCycleStatus;
          planted_date: string;
          expected_harvest_date?: string | null;
          ploughed_out_date?: string | null;
          area_hectares: number;
          yield_tonnes?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crop_cycles"]["Insert"]>;
        Relationships: [];
      };
      field_activities: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string | null;
          activity_type: FieldActivityType;
          activity_date: string;
          product: string | null;
          rate: number | null;
          rate_unit: string | null;
          cost: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id?: string | null;
          activity_type: FieldActivityType;
          activity_date?: string;
          product?: string | null;
          rate?: number | null;
          rate_unit?: string | null;
          cost?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["field_activities"]["Insert"]>;
        Relationships: [];
      };
      harvest_plans: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string;
          cutting_date_planned: string | null;
          burn_permit_ref: string | null;
          burn_date: string | null;
          cutting_contractor: string | null;
          status: HarvestPlanStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string;
          cutting_date_planned?: string | null;
          burn_permit_ref?: string | null;
          burn_date?: string | null;
          cutting_contractor?: string | null;
          status?: HarvestPlanStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["harvest_plans"]["Insert"]>;
        Relationships: [];
      };
      harvest_captures: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string;
          harvest_plan_id: string | null;
          capture_date: string;
          tonnes_cut: number;
          cutter_team: string | null;
          field_edge_stock_tonnes: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string;
          harvest_plan_id?: string | null;
          capture_date?: string;
          tonnes_cut: number;
          cutter_team?: string | null;
          field_edge_stock_tonnes?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["harvest_captures"]["Insert"]>;
        Relationships: [];
      };
      field_photos: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          activity_id: string | null;
          harvest_capture_id: string | null;
          path: string;
          caption: string | null;
          taken_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          activity_id?: string | null;
          harvest_capture_id?: string | null;
          path: string;
          caption?: string | null;
          taken_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["field_photos"]["Insert"]>;
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id: string | null;
          delivery_no: string;
          delivery_date: string;
          haulier: string | null;
          vehicle_reg: string | null;
          tonnes_loaded: number;
          mill: MillName;
          status: DeliveryStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          field_id: string;
          crop_cycle_id?: string | null;
          delivery_no: string;
          delivery_date?: string;
          haulier?: string | null;
          vehicle_reg?: string | null;
          tonnes_loaded: number;
          mill: MillName;
          status?: DeliveryStatus;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deliveries"]["Insert"]>;
        Relationships: [];
      };
      mill_results: {
        Row: {
          id: string;
          tenant_id: string;
          delivery_id: string;
          tonnes_accepted: number;
          sucrose_pct: number;
          rv_value: number | null;
          source: "manual" | "import";
          notes: string | null;
          captured_by: string | null;
          captured_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          delivery_id: string;
          tonnes_accepted: number;
          sucrose_pct: number;
          rv_value?: number | null;
          source?: "manual" | "import";
          notes?: string | null;
          captured_by?: string | null;
          captured_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mill_results"]["Insert"]>;
        Relationships: [];
      };
      staff_employees: {
        Row: {
          id: string;
          tenant_id: string;
          staff_no: string;
          full_name: string;
          national_id: string | null;
          phone: string | null;
          email: string | null;
          position: string;
          employment_type: StaffEmploymentType;
          start_date: string;
          end_date: string | null;
          bank_account: Record<string, unknown> | null;
          pay_rate: number;
          pay_frequency: StaffPayFrequency;
          paye_number: string | null;
          enpf_number: string | null;
          status: StaffStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          staff_no: string;
          full_name: string;
          national_id?: string | null;
          phone?: string | null;
          email?: string | null;
          position: string;
          employment_type?: StaffEmploymentType;
          start_date?: string;
          end_date?: string | null;
          bank_account?: Record<string, unknown> | null;
          pay_rate: number;
          pay_frequency?: StaffPayFrequency;
          paye_number?: string | null;
          enpf_number?: string | null;
          status?: StaffStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_employees"]["Insert"]>;
        Relationships: [];
      };
      contractors: {
        Row: {
          id: string;
          tenant_id: string;
          contractor_no: string;
          business_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          service_type: ContractorServiceType;
          national_id_or_reg_no: string | null;
          bank_account: Record<string, unknown> | null;
          rate_basis: ContractorRateBasis;
          rate_amount: number;
          withholding_applicable: boolean;
          status: ContractorStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contractor_no: string;
          business_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          service_type: ContractorServiceType;
          national_id_or_reg_no?: string | null;
          bank_account?: Record<string, unknown> | null;
          rate_basis: ContractorRateBasis;
          rate_amount: number;
          withholding_applicable?: boolean;
          status?: ContractorStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contractors"]["Insert"]>;
        Relationships: [];
      };
      contractor_jobs: {
        Row: {
          id: string;
          tenant_id: string;
          contractor_id: string;
          field_id: string | null;
          service_type: ContractorServiceType;
          job_date: string;
          quantity: number;
          computed_amount: number;
          is_override: boolean;
          override_reason: string | null;
          status: ContractorJobStatus;
          linked_bill_id: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contractor_id: string;
          field_id?: string | null;
          service_type: ContractorServiceType;
          job_date?: string;
          quantity: number;
          computed_amount: number;
          is_override?: boolean;
          override_reason?: string | null;
          status?: ContractorJobStatus;
          linked_bill_id?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contractor_jobs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      crop_cycle_yields: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          cycle_type: CropCycleType;
          ratoon_number: number;
          status: CropCycleStatus;
          planted_date: string;
          expected_harvest_date: string | null;
          ploughed_out_date: string | null;
          area_hectares: number;
          yield_tonnes: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          field_tenant_id: string;
          field_code: string;
          field_hectares: number;
          tonnes_per_ha: number | null;
        };
        Relationships: [];
      };
      ratoon_decline_curve: {
        Row: {
          tenant_id: string;
          field_id: string;
          field_code: string;
          crop_cycle_id: string;
          cycle_type: CropCycleType;
          ratoon_number: number;
          planted_date: string;
          ploughed_out_date: string | null;
          tonnes_per_ha: number | null;
          prev_tonnes_per_ha: number | null;
          pct_change_vs_prev: number | null;
        };
        Relationships: [];
      };
      field_replant_recommendations: {
        Row: {
          tenant_id: string;
          field_id: string;
          field_code: string;
          latest_ratoon_number: number;
          latest_tonnes_per_ha: number | null;
          plant_tonnes_per_ha: number | null;
          reason: string | null;
        };
        Relationships: [];
      };
      delivery_details: {
        Row: {
          id: string;
          tenant_id: string;
          field_id: string;
          field_code: string;
          field_variety: string | null;
          crop_cycle_id: string | null;
          delivery_no: string;
          delivery_date: string;
          haulier: string | null;
          vehicle_reg: string | null;
          tonnes_loaded: number;
          mill: MillName;
          status: DeliveryStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          mill_result_id: string | null;
          tonnes_accepted: number | null;
          sucrose_pct: number | null;
          rv_value: number | null;
          mill_result_source: "manual" | "import" | null;
          mill_result_notes: string | null;
          mill_result_captured_by: string | null;
          mill_result_captured_at: string | null;
        };
        Relationships: [];
      };
      field_delivery_reconciliation: {
        Row: {
          tenant_id: string;
          field_id: string;
          field_code: string;
          tonnes_cut: number;
          tonnes_loaded: number;
          tonnes_accepted: number;
          variance_tonnes: number;
          recovery_pct: number | null;
        };
        Relationships: [];
      };
      staff_employees_directory: {
        Row: {
          id: string;
          tenant_id: string;
          staff_no: string;
          full_name: string;
          national_id: string | null;
          phone: string | null;
          email: string | null;
          position: string;
          employment_type: StaffEmploymentType;
          start_date: string;
          end_date: string | null;
          pay_rate: number | null;
          pay_frequency: StaffPayFrequency;
          paye_number: string | null;
          enpf_number: string | null;
          status: StaffStatus;
          bank_account: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
      contractors_directory: {
        Row: {
          id: string;
          tenant_id: string;
          contractor_no: string;
          business_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          service_type: ContractorServiceType;
          national_id_or_reg_no: string | null;
          rate_basis: ContractorRateBasis;
          rate_amount: number;
          withholding_applicable: boolean;
          status: ContractorStatus;
          bank_account: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
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
      post_journal_entry: {
        Args: { p_entry_id: string };
        Returns: Database["public"]["Tables"]["journal_entries"]["Row"];
      };
      seed_default_chart_of_accounts: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
      issue_invoice: {
        Args: { p_invoice_id: string };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      record_invoice_payment: {
        Args: {
          p_invoice_id: string;
          p_amount: number;
          p_paid_at: string;
          p_method: string | null;
          p_reference: string | null;
          p_deposit_account_id: string;
        };
        Returns: Database["public"]["Tables"]["invoice_payments"]["Row"];
      };
      issue_credit_note: {
        Args: { p_invoice_id: string; p_amount: number; p_reason: string | null; p_revenue_account_id: string };
        Returns: Database["public"]["Tables"]["credit_notes"]["Row"];
      };
      compute_payout_run: {
        Args: { p_run_id: string };
        Returns: Database["public"]["Tables"]["payout_run_lines"]["Row"][];
      };
      recompute_payout_line: {
        Args: { p_line_id: string };
        Returns: Database["public"]["Tables"]["payout_run_lines"]["Row"];
      };
      approve_payout_run: {
        Args: { p_run_id: string };
        Returns: Database["public"]["Tables"]["payout_runs"]["Row"];
      };
      mark_payout_run_paid: {
        Args: { p_run_id: string };
        Returns: Database["public"]["Tables"]["payout_runs"]["Row"];
      };
      add_member_account_entry: {
        Args: {
          p_tenant_id: string;
          p_member_id: string;
          p_entry_date: string;
          p_kind: MemberAccountEntryKind;
          p_description: string;
          p_amount: number;
        };
        Returns: Database["public"]["Tables"]["member_account_entries"]["Row"];
      };
      seed_default_deduction_types: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
      create_quick_journal_entries: {
        Args: { p_tenant_id: string; p_offset_account_id: string; p_rows: Record<string, unknown>[] };
        Returns: Database["public"]["Tables"]["journal_entries"]["Row"][];
      };
      setup_petty_cash_fund: {
        Args: { p_tenant_id: string; p_float_amount: number; p_custodian_name: string | null; p_source_account_id: string | null };
        Returns: Database["public"]["Tables"]["petty_cash_funds"]["Row"];
      };
      record_petty_cash_expense: {
        Args: {
          p_fund_id: string;
          p_tx_date: string;
          p_description: string | null;
          p_amount: number;
          p_category_account_id: string;
          p_receipt_ref: string | null;
        };
        Returns: Database["public"]["Tables"]["petty_cash_transactions"]["Row"];
      };
      record_petty_cash_replenishment: {
        Args: {
          p_fund_id: string;
          p_tx_date: string;
          p_description: string | null;
          p_amount: number;
          p_source_account_id: string;
          p_receipt_ref: string | null;
        };
        Returns: Database["public"]["Tables"]["petty_cash_transactions"]["Row"];
      };
      record_stock_receipt: {
        Args: {
          p_item_id: string;
          p_quantity: number;
          p_unit_cost: number;
          p_credit_account_id: string;
          p_reference: string | null;
          p_batch_no?: string | null;
          p_expiry_date?: string | null;
        };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      list_inventory_stock_levels: {
        Args: { p_tenant_id: string };
        Returns: {
          id: string;
          sku: string;
          name: string;
          category: InventoryItemCategory;
          unit: string;
          quantity_on_hand: number;
          is_low_stock: boolean;
          storage_location: string | null;
          is_active: boolean;
        }[];
      };
      record_stock_issue: {
        Args: { p_item_id: string; p_quantity: number; p_expense_account_id: string; p_reference: string | null };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      record_stock_adjustment: {
        Args: { p_item_id: string; p_quantity_delta: number; p_reason: string | null };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      issue_purchase_order: {
        Args: { p_po_id: string };
        Returns: Database["public"]["Tables"]["purchase_orders"]["Row"];
      };
      receive_purchase_order_lines: {
        Args: { p_po_id: string; p_received_date: string; p_lines: Record<string, unknown>[]; p_reference: string | null };
        Returns: Database["public"]["Tables"]["goods_received_notes"]["Row"];
      };
      mark_supplier_bill_paid: {
        Args: { p_bill_id: string; p_payment_date: string; p_payment_account_id: string };
        Returns: Database["public"]["Tables"]["supplier_bills"]["Row"];
      };
      start_crop_cycle: {
        Args: {
          p_field_id: string;
          p_cycle_type: CropCycleType;
          p_ratoon_number: number;
          p_planted_date: string;
          p_expected_harvest_date: string | null;
        };
        Returns: Database["public"]["Tables"]["crop_cycles"]["Row"];
      };
      plough_out_and_replant: {
        Args: {
          p_crop_cycle_id: string;
          p_ploughed_out_date: string;
          p_new_planted_date: string;
          p_new_variety: string | null;
          p_new_irrigation_type: IrrigationType | null;
        };
        Returns: Database["public"]["Tables"]["crop_cycles"]["Row"];
      };
      record_mill_result: {
        Args: {
          p_delivery_id: string;
          p_tonnes_accepted: number;
          p_sucrose_pct: number;
          p_rv_value: number | null;
          p_notes: string | null;
        };
        Returns: Database["public"]["Tables"]["mill_results"]["Row"];
      };
      reconcile_delivery: {
        Args: { p_delivery_id: string };
        Returns: Database["public"]["Tables"]["deliveries"]["Row"];
      };
      reveal_bank_details: {
        Args: { p_entity_type: "staff_employees" | "contractors"; p_entity_id: string };
        Returns: Record<string, unknown>;
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
      account_type: AccountType;
      journal_entry_status: JournalEntryStatus;
      invoice_status: InvoiceStatus;
      payout_run_status: PayoutRunStatus;
      member_account_entry_kind: MemberAccountEntryKind;
      petty_cash_tx_type: PettyCashTxType;
      inventory_item_category: InventoryItemCategory;
      inventory_item_condition: InventoryItemCondition;
      stock_movement_type: StockMovementType;
      purchase_order_status: PurchaseOrderStatus;
      supplier_bill_status: SupplierBillStatus;
      irrigation_type: IrrigationType;
      field_status: FieldStatus;
      crop_cycle_type: CropCycleType;
      crop_cycle_status: CropCycleStatus;
      field_activity_type: FieldActivityType;
      harvest_plan_status: HarvestPlanStatus;
      delivery_status: DeliveryStatus;
      staff_employment_type: StaffEmploymentType;
      staff_pay_frequency: StaffPayFrequency;
      staff_status: StaffStatus;
      contractor_service_type: ContractorServiceType;
      contractor_rate_basis: ContractorRateBasis;
      contractor_status: ContractorStatus;
      contractor_job_status: ContractorJobStatus;
    };
  };
}
