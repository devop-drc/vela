-- Future-proof the role set: all staff are 'admin' for now; 'management'
-- and 'support' become usable later without another migration.
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
  add constraint user_roles_role_check check (role in ('admin','management','support'));
