-- Align admin benutzer entries with auth.users IDs so they no longer appear as unactivated
-- 1) Remove benutzer rows for the emails if their IDs don't match auth.users IDs
WITH target AS (
  SELECT id, email::citext AS email
  FROM auth.users
  WHERE email IN ('luca@alltagshilfe-fischer.de','florian@alltagshilfe-fischer.de')
)
DELETE FROM public.benutzer b
USING target t
WHERE b.email = t.email
  AND b.id <> t.id;

-- 2) Insert/Upsert benutzer rows using the auth.users IDs and role=admin
INSERT INTO public.benutzer (id, email, rolle)
SELECT au.id, au.email::citext, 'admin'
FROM auth.users au
WHERE au.email IN ('luca@alltagshilfe-fischer.de','florian@alltagshilfe-fischer.de')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    rolle = 'admin';