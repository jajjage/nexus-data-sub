-- DROP schema public CASCADE;
CREATE schema public;
-- DROP TABLE knex_migrations, knex_migrations_lock;
-- DELETE FROM public.knex_migrations_lock WHERE index = '1'

-- UPDATE public.users SET two_factor_secret=null WHERE id = 'bd043a18-09d1-4ff5-a699-f593bab7ce1f'

-- SELECT
-- u.id AS user_id,
-- u.email,
-- u.password,
-- u.role,
-- u.is_verified AS "isVerified",
-- u.two_factor_enabled,
-- u.two_factor_secret,
-- b.id AS backup_id,
-- b.two_factor_backup_codes,
-- p.name AS permission_name,
-- p.id AS permission_id,
-- p.description AS permission_description
-- FROM users u
-- LEFT JOIN backup_code b ON u.id = b.user_id
-- JOIN roles r ON u.role_id = r.id
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE LOWER(u.email) = 'admin@example.com'
-- ORDER BY p.name
