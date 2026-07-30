# Test Personas

Reference credentials for manual/QA testing across each role in `member_role`
(`supabase/migrations/0001_module_a_tenant_access.sql`). All personas belong
to the same test tenant.

Provision them by running `supabase/seed_personas.sql` in the Supabase SQL
editor (as postgres) — it creates a dedicated "RazFarm Test Co-op" tenant and
pre-confirms all six accounts so they can sign in immediately, no SMS/email
OTP step needed.

| Role | Email | Password |
|---|---|---|
| Chairman | test.chairman@canandledger.test | Test@Chairman123 |
| Treasurer | test.treasurer@canandledger.test | Test@Treasurer123 |
| Secretary | test.secretary@canandledger.test | Test@Secretary123 |
| Supervisor | test.supervisor@canandledger.test | Test@Supervisor123 |
| Accountant | test.accountant@canandledger.test | Test@Accountant123 |
| Member | test.member@canandledger.test | Test@Member123 |

## How to provision

Run `supabase/seed_personas.sql` once against your project. Re-running it
will fail on unique constraints (`tenants.slug`, `auth.users.email`) rather
than duplicating rows — drop the "RazFarm Test Co-op" tenant and its users
first if you need to reseed.

Alternative (no direct DB access): register the **Chairman** via `/register`
first (creates the tenant through `register_association`), then sign in as
Chairman and invite the other five roles from the Team page. Each invited
persona completes sign-up + OTP verification with the password listed above.
