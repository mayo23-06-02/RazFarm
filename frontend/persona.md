# Test Personas

Reference credentials for manual/QA testing across each role in `member_role`
(`supabase/migrations/0001_module_a_tenant_access.sql`). All personas belong
to the same test tenant.

These are **not yet provisioned** — no `SUPABASE_SERVICE_ROLE_KEY` was available
to create pre-confirmed auth users directly, and the app's sign-up flow
requires SMS/email OTP verification, so accounts must be created through the
UI (register + invite) or via the Supabase Dashboard.

| Role | Email | Password |
|---|---|---|
| Chairman | test.chairman@canandledger.test | Test@Chairman123 |
| Treasurer | test.treasurer@canandledger.test | Test@Treasurer123 |
| Secretary | test.secretary@canandledger.test | Test@Secretary123 |
| Supervisor | test.supervisor@canandledger.test | Test@Supervisor123 |
| Accountant | test.accountant@canandledger.test | Test@Accountant123 |
| Member | test.member@canandledger.test | Test@Member123 |

## How to provision

1. Register the **Chairman** first via `/register` (creates the tenant through
   `register_association`) — chairman is always the founding member.
2. Sign in as Chairman and invite the other five roles from the Team page
   (`invites` table / `accept_invite` flow), using the emails above.
3. Each invited persona completes sign-up + OTP verification with the
   password listed above.

To skip OTP entirely, create the users via Supabase Dashboard → Authentication
→ Users → "Add user" (mark email confirmed), then insert a matching row into
`public.memberships` for the test tenant with the corresponding `role`.
