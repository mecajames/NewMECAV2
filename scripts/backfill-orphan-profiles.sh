#!/usr/bin/env bash
# Backfill the 4 OAuth users on prod that have an auth.users row but no profiles row.
# Each was a Google-OAuth signup whose ensureProfileExists call silently failed,
# leaving them with a Supabase session but no profile -> 404 loop -> "pushed back to login".
#
# Verify nothing exists for them first (idempotent guard), then create one row each.
# These POSTs hit the public createProfile endpoint, which calls profilesService.create()
# and auto-generates meca_id via generateNextMecaId() in the 701501-799999 range.

set -euo pipefail

BACKEND="${BACKEND_URL:-https://mecacaraudio.com}"

echo "==> Pre-check: confirming all 4 are still missing profiles"
SUPABASE_URL="${SUPABASE_URL:-https://dbprod.mecacaraudio.com}"
SVC_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY before running}"

for id in \
  c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686 \
  464fa542-c249-42d7-bfc7-b1382a205d33 \
  d28f6098-273e-4a63-9f9d-8075216775c6 \
  523dee5a-7619-409a-938c-f35f783158b3
do
  found=$(curl -s -G "$SUPABASE_URL/rest/v1/profiles" \
    -H "apikey: $SVC_KEY" -H "Authorization: Bearer $SVC_KEY" \
    --data-urlencode "id=eq.$id" --data-urlencode "select=id" | grep -c '"id"' || true)
  echo "  $id: existing=$found"
done

echo
echo "==> Creating 4 missing profiles"

create_profile() {
  local id="$1" email="$2" first="$3" last="$4"
  echo "  $email ($id)"
  curl -sS -X POST "$BACKEND/api/profiles" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$id\",\"email\":\"$email\",\"first_name\":\"$first\",\"last_name\":\"$last\",\"role\":\"user\",\"membership_status\":\"none\"}" \
    | python -c "import sys,json; d=json.load(sys.stdin); print(f'    -> created meca_id={d.get(\"meca_id\")} id={d.get(\"id\")}')"
}

create_profile "c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686" "wangocivic@gmail.com"  "wayne"  "beaird"
create_profile "464fa542-c249-42d7-bfc7-b1382a205d33" "mecacaraudio@gmail.com" "MECA"   "Audio"
create_profile "d28f6098-273e-4a63-9f9d-8075216775c6" "mcla72883@gmail.com"    "Sierra" "Quick"
create_profile "523dee5a-7619-409a-938c-f35f783158b3" "blackbart901@gmail.com" "Michael" ""

echo
echo "==> Post-check: all 4 should now exist"
for id in \
  c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686 \
  464fa542-c249-42d7-bfc7-b1382a205d33 \
  d28f6098-273e-4a63-9f9d-8075216775c6 \
  523dee5a-7619-409a-938c-f35f783158b3
do
  row=$(curl -s -G "$SUPABASE_URL/rest/v1/profiles" \
    -H "apikey: $SVC_KEY" -H "Authorization: Bearer $SVC_KEY" \
    --data-urlencode "id=eq.$id" --data-urlencode "select=id,email,meca_id,first_name,last_name")
  echo "  $row"
done
