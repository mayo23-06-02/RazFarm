-- Enum values only. Postgres will not let this transaction use the new
-- values, so nothing below inserts a feed/vaccine/medication/litter row.

alter type public.inventory_item_category add value if not exists 'feed';
alter type public.inventory_item_category add value if not exists 'vaccine';
alter type public.inventory_item_category add value if not exists 'medication';
alter type public.inventory_item_category add value if not exists 'litter';

alter table public.inventory_items
  add column unit_weight_kg numeric(10, 3) check (unit_weight_kg is null or unit_weight_kg > 0);
