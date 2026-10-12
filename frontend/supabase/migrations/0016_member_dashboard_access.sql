-- Member dashboard: let a plain member read their own fields, the deliveries
-- off those fields and the mill results for them. These are extra permissive
-- policies, OR'd with the existing role-based *_select policies, so staff
-- access is unchanged. "Own" means fields.member_id → members.user_id.

create policy fields_select_own on public.fields
  for select using (
    exists (select 1 from public.members m where m.id = fields.member_id and m.user_id = auth.uid())
  );

create policy deliveries_select_own on public.deliveries
  for select using (
    exists (
      select 1 from public.fields f join public.members m on m.id = f.member_id
      where f.id = deliveries.field_id and m.user_id = auth.uid()
    )
  );

create policy mill_results_select_own on public.mill_results
  for select using (
    exists (
      select 1 from public.deliveries d
      join public.fields f on f.id = d.field_id
      join public.members m on m.id = f.member_id
      where d.id = mill_results.delivery_id and m.user_id = auth.uid()
    )
  );
