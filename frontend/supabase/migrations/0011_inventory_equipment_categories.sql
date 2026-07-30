-- Module F.1 follow-up: extend inventory_item_category to cover equipment,
-- vehicles and plant equipment, so supervisor/accountant (already the
-- inventory-manager roles per 0009 §3) can track them the same way as
-- fertilizer/chemical/seed cane — quantity on hand + weighted-average cost,
-- reusing the existing inventory_items table and record_stock_* RPCs as-is.
-- No RLS/role changes needed: jwt_is_inventory_viewer/manager already apply
-- per tenant_id regardless of category.

alter type public.inventory_item_category add value if not exists 'equipment';
alter type public.inventory_item_category add value if not exists 'vehicle';
alter type public.inventory_item_category add value if not exists 'plant_equipment';
