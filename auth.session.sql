-- DROP schema public CASCADE;
-- CREATE schema public;
-- DROP TABLE knex_migrations, knex_migrations_lock;
-- DELETE FROM public.users WHERE id = 'bd043a18-09d1-4ff5-a699-f593bab7ce1f';
INSERT INTO public.providers (id, name, api_base, webhook_secret, is_active, config, created_at)
VALUES ('e7b8f8a1-5f4c-4d2e-9f3a-1c2b3d4e5f6a', 'TestProvider', 'https://api.testprovider.com', 'supersecretwebhookkey', true, '{"apiKey":"testapikey","apiSecret":"testapisecret"}', NOW());

-- UPDATE public.users SET two_factor_secret=null WHERE id = 'bd043a18-09d1-4ff5-a699-f593bab7ce1f'
-- INSERT INTO public.users (id, email, full_name, phone_number, role, password, role_id, is_verified, created_at, updated_at)
-- VALUES ('bd043a18-09d1-4ff5-a699-f593bab7ce1f', 'admin@example.com', 'Admin User', '123-456-7890', 'admin', '$2b$10$RHKpnJTOl/DgjIpUNfjkEeSEMol.akG46Gg9LRBua8dJH1thH6J5a', 'c40e47c7-c06b-47d7-8c7c-3f41bd4c3a33', true, NOW(), NOW());
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
