# Console Audit Report — prod

**Run:** 2026-04-16T23:45:10.165Z

**Routes crawled:** 92

**Unique issues:** 20

## Unique issues (ranked by frequency)

| Count | Kind | Key | Sample routes |
|---|---|---|---|
| 177 | errors | `error:Failed to load resource: the server responded with a status of 429 ()` | /forever-members, /shop, /shop/cart +43 |
| 133 | network | `http429:https://mecacaraudio.com/api/profiles/983f6056-b83f-4a79-b093-692f4dfe3635` | /forever-members, /shop, /shop/cart +42 |
| 133 | errors | `error:Error fetching profile: JSHandle@object` | /forever-members, /shop, /shop/cart +42 |
| 44 | network | `http429:https://mecacaraudio.com/api/site-settings` | /admin/shop/orders, /admin/coupons, /admin/permissions +19 |
| 22 | errors | `error:Error checking maintenance mode: JSHandle@object` | /admin/shop/orders, /admin/coupons, /admin/permissions +19 |
| 22 | errors | `error:Error fetching site settings: JSHandle@object` | /admin/shop/orders, /admin/coupons, /admin/permissions +19 |
| 5 | errors | `error:Failed to load resource: the server responded with a status of 404 ()` | /admin/business-listings |
| 2 | network | `reqfail:POST:https://mecacaraudio.com/cdn-cgi/rum:net::ERR_ABORTED` | /admin/advertisers, /shop/products/33cc7766-cba2-400d-a5a1-361e0ef973e7 |
| 1 | network | `reqfail:GET:https://mecacaraudio.com/api/standings/classes:net::ERR_ABORTED` | /standings |
| 1 | network | `reqfail:GET:https://mecacaraudio.com/api/standings/leaderboard:net::ERR_ABORTED` | /team-standings |
| 1 | network | `reqfail:GET:https://mecacaraudio.com/api/standings/teams:net::ERR_ABORTED` | /rulebooks |
| 1 | network | `reqfail:GET:https://mecacaraudio.com/api/notifications:net::ERR_ABORTED` | /rulebooks |
| 1 | errors | `error:reCAPTCHA v2 error` | /host-event |
| 1 | network | `http401:https://mecacaraudio.com/api/judges/directory` | /judges |
| 1 | errors | `error:Failed to load resource: the server responded with a status of 401 ()` | /judges |
| 1 | network | `http404:https://mecacaraudio.com/wp-content/uploads/2022/09/BoB-Retail-Logo-150x150-1.jpg` | /admin/business-listings |
| 1 | network | `http404:https://mecacaraudio.com/wp-content/uploads/2022/05/Only-Tint-150x150-1.jpg` | /admin/business-listings |
| 1 | network | `http404:https://mecacaraudio.com/wp-content/uploads/2022/10/royality-vinyls-directory.jpg` | /admin/business-listings |
| 1 | network | `http404:https://mecacaraudio.com/wp-content/uploads/2022/05/Team-Nuts-Logo-150x150-1.jpg` | /admin/business-listings |
| 1 | network | `http404:https://mecacaraudio.com/wp-content/uploads/2022/07/why-so-serious-directory-150x150-1.jpg` | /admin/business-listings |

## Per-route counts

| Route | errors | warnings | network | mixed |
|---|---|---|---|---|
| `/standings` | 0 | 0 | 1 | 0 |
| `/team-standings` | 0 | 0 | 1 | 0 |
| `/rulebooks` | 0 | 0 | 2 | 0 |
| `/host-event` | 1 | 0 | 0 | 0 |
| `/judges` | 1 | 0 | 1 | 0 |
| `/forever-members` | 6 | 0 | 3 | 0 |
| `/shop` | 6 | 0 | 3 | 0 |
| `/shop/cart` | 6 | 0 | 3 | 0 |
| `/world-records` | 6 | 0 | 3 | 0 |
| `/world-finals/register` | 6 | 0 | 3 | 0 |
| `/dashboard` | 6 | 0 | 3 | 0 |
| `/dashboard/mymeca` | 6 | 0 | 3 | 0 |
| `/dashboard/business-listing` | 6 | 0 | 3 | 0 |
| `/dashboard/membership` | 6 | 0 | 3 | 0 |
| `/dashboard/admin` | 6 | 0 | 3 | 0 |
| `/profile` | 6 | 0 | 3 | 0 |
| `/public-profile` | 6 | 0 | 3 | 0 |
| `/billing` | 6 | 0 | 3 | 0 |
| `/membership` | 6 | 0 | 3 | 0 |
| `/my-registrations` | 6 | 0 | 3 | 0 |
| `/tickets` | 6 | 0 | 3 | 0 |
| `/shop/orders` | 6 | 0 | 3 | 0 |
| `/finals-voting` | 6 | 0 | 3 | 0 |
| `/admin/members` | 6 | 0 | 3 | 0 |
| `/admin/seasons` | 6 | 0 | 3 | 0 |
| `/admin/classes` | 6 | 0 | 3 | 0 |
| `/admin/formats` | 6 | 0 | 3 | 0 |
| `/admin/membership-types` | 6 | 0 | 3 | 0 |
| `/admin/business-listings` | 5 | 0 | 5 | 0 |
| `/admin/shop/orders` | 4 | 0 | 2 | 0 |
| `/admin/coupons` | 6 | 0 | 3 | 0 |
| `/admin/permissions` | 10 | 0 | 5 | 0 |
| `/admin/advertisers` | 10 | 0 | 6 | 0 |
| `/admin/banners` | 10 | 0 | 5 | 0 |
| `/admin/banners/analytics` | 10 | 0 | 5 | 0 |
| `/admin/points-configuration` | 10 | 0 | 5 | 0 |
| `/admin/analytics` | 10 | 0 | 5 | 0 |
| `/admin/search-console` | 10 | 0 | 5 | 0 |
| `/admin/seo-settings` | 10 | 0 | 5 | 0 |
| `/admin/membership-cards` | 10 | 0 | 5 | 0 |
| `/admin/finals-voting` | 10 | 0 | 5 | 0 |
| `/admin/world-records` | 10 | 0 | 5 | 0 |
| `/admin/hall-of-fame` | 10 | 0 | 5 | 0 |
| `/admin/forever-members` | 10 | 0 | 5 | 0 |
| `/admin/login-audit` | 10 | 0 | 5 | 0 |
| `/admin/admin-audit` | 10 | 0 | 5 | 0 |
| `/admin/qa-checklist` | 10 | 0 | 5 | 0 |
| `/admin/score-sheet-editor` | 10 | 0 | 5 | 0 |
| `/events/b2a1e095-edf8-4435-85b8-7a594ab1ffe7` | 10 | 0 | 5 | 0 |
| `/shop/products/33cc7766-cba2-400d-a5a1-361e0ef973e7` | 10 | 0 | 6 | 0 |
| `/rulebooks/4c342419-06b6-4122-afc7-c68b4fb8719b` | 10 | 0 | 5 | 0 |
| `/retailers/38434ec8-3b7f-42ae-acd4-d756f7722920` | 6 | 0 | 3 | 0 |
