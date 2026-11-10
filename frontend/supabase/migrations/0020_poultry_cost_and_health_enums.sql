-- New enum labels only. The next migration is the one that uses them.

alter type public.poultry_cost_category add value if not exists 'firewood';
alter type public.poultry_cost_category add value if not exists 'transport';
alter type public.poultry_cost_category add value if not exists 'labour';
alter type public.poultry_cost_category add value if not exists 'other';
alter type public.poultry_cost_category add value if not exists 'vaccine';

alter type public.poultry_cost_source add value if not exists 'manual';
alter type public.poultry_cost_source add value if not exists 'health';
