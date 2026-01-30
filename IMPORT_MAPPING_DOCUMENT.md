# Historical Data Import - Column Mapping Document

Generated: 2026-01-22

## Summary

| Table | Dump Cols | Local Cols | Status | Action |
|-------|-----------|------------|--------|--------|
| **seasons** | 9 | 10 | COMPATIBLE | Direct import, extra local col defaults |
| **events** | 33 | 32 | COMPATIBLE | Skip col 18 (format), reorder columns |
| **profiles** | 51 | 50 | COMPATIBLE | Skip col 27 (membership_expires_at) |
| **competition_classes** | 9 | 9 | EXACT MATCH | Direct import |
| **competition_results** | 23 | 22 | COMPATIBLE | Skip col 23 (state_code) |
| **memberships** | 40 | 40 | EXACT MATCH | Direct import |
| **orders** | 26 | 13 | INCOMPATIBLE | Needs investigation |

---

## 1. SEASONS (COMPATIBLE)

### Column Mapping
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | e10bf430-d81b-4786-957f-f46be5575753 | 1 | id |
| 2 | year | 2027 | 2 | year |
| 3 | name | 2027 Season | 3 | name |
| 4 | start_date | 2027-01-01 | 4 | start_date |
| 5 | end_date | 2027-12-31 | 5 | end_date |
| 6 | is_current | f | 6 | is_current |
| 7 | is_next | f | 7 | is_next |
| 8 | created_at | 2025-11-01 16:29:54.474+00 | 8 | created_at |
| 9 | updated_at | 2025-11-10 13:47:43.975771+00 | 9 | updated_at |
| - | - | - | 10 | qualification_points_threshold (defaults NULL) |

### Sample Data
```
Row 1: e10bf430... | 2027 | 2027 Season | 2027-01-01 | 2027-12-31 | f | f | 2025-11-01... | 2025-11-10...
Row 2: 434aaa11... | 2026 | 2026 Season | 2025-10-12 | 2026-10-13 | t | f | 2025-11-01... | 2025-11-16...
Row 3: 43b425bb... | 2025 | 2025 Season | 2024-10-12 | 2025-10-13 | f | f | 2025-11-01... | 2025-11-16...
```

### Import Action
- Direct import, 9 dump columns to first 9 local columns
- Local column 10 (qualification_points_threshold) defaults to NULL

---

## 2. EVENTS (COMPATIBLE - Requires Column Reordering)

### Column Mapping
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | abfcf14d-7889-4bbc-8e05-41d159c4f521 | 1 | id |
| 2 | title | Bumpin In The New Year | 2 | title |
| 3 | description | \N | 3 | description |
| 4 | event_date | 2020-01-04 05:00:00+00 | 4 | event_date |
| 5 | registration_deadline | \N | 5 | registration_deadline |
| 6 | venue_name | Miami Pro Audio | 6 | venue_name |
| 7 | venue_address | 11041 Beach Blvd. | 7 | venue_address |
| 8 | latitude | \N | 8 | latitude |
| 9 | longitude | \N | 9 | longitude |
| 10 | flyer_url | https://assets.mecacaraudio.net/... | 10 | flyer_url |
| 11 | event_director_id | \N | 11 | event_director_id |
| 12 | status | completed | 12 | status |
| 13 | max_participants | \N | 13 | max_participants |
| 14 | registration_fee | 0.00 | 14 | registration_fee |
| 15 | created_at | 2026-01-13 23:19:25.787799+00 | 15 | created_at |
| 16 | updated_at | 2026-01-13 23:19:25.787799+00 | 16 | updated_at |
| 17 | season_id | 00c95f26-26a6-4b5c-9e2b-9a044be27591 | **21** | season_id |
| **18** | **format** | **\N** | **SKIP** | **(column removed)** |
| 19 | venue_city | Jacksonville | **17** | venue_city |
| 20 | venue_state | FL | **18** | venue_state |
| 21 | venue_postal_code | 32246 | **19** | venue_postal_code |
| 22 | venue_country | US | **20** | venue_country |
| 23 | points_multiplier | 3 | **22** | points_multiplier |
| 24 | event_type | standard | **24** | event_type |
| 25 | multi_day_group_id | \N | 25 | multi_day_group_id |
| 26 | day_number | \N | 26 | day_number |
| 27 | member_entry_fee | \N | 27 | member_entry_fee |
| 28 | non_member_entry_fee | \N | 28 | non_member_entry_fee |
| 29 | has_gate_fee | f | 29 | has_gate_fee |
| 30 | gate_fee | \N | 30 | gate_fee |
| 31 | flyer_image_position | \N | 31 | flyer_image_position |
| 32 | formats | ["SPL"] | **23** | formats |
| 33 | multi_day_results_mode | \N | 32 | multi_day_results_mode |

### Sample Data (venue_state/venue_country need ISO normalization)
```
venue_state samples: FL, NV, LA, CA, TN, OH, IN, AL, GA, PA, IL, KY, NC
venue_country samples: US (already ISO compliant)
```

### Import Action
- Skip dump column 18 (format - all NULL)
- Reorder columns to match local schema
- **ISO Normalization needed**: venue_state values already appear to be 2-letter codes

---

## 3. PROFILES (COMPATIBLE - Skip membership_expires_at)

### Column Mapping (showing key differences)
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1-26 | (same) | - | 1-26 | (same) |
| **27** | **membership_expires_at** | **\N** | **SKIP** | **(column removed)** |
| 28 | address | 363 Chestnut Ridge Road | **27** | address |
| 29 | city | Washington | **28** | city |
| 30 | state | PA | **29** | state |
| 31 | postal_code | 15301 | **30** | postal_code |
| 32 | country | US | **31** | country |
| 33-51 | (rest) | - | 32-50 | (rest, shifted by 1) |

### Sample Data (state/country fields need ISO review)
```
Profile 1:
- billing_country (col 20): USA
- shipping_country (col 25): USA
- state (col 30): PA
- country (col 32): US

Note: Inconsistency - billing_country uses "USA" but country uses "US"
```

### Import Action
- Skip dump column 27 (membership_expires_at)
- Reorder remaining columns
- **ISO Normalization needed**:
  - billing_country: "USA" -> "US"
  - shipping_country: "USA" -> "US"

---

## 4. COMPETITION_CLASSES (EXACT MATCH)

### Column Mapping
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | da39ab0b-66ad-4c1f-ab85-262e0f8b18d1 | 1 | id |
| 2 | name | Street | 2 | name |
| 3 | abbreviation | STR | 3 | abbreviation |
| 4 | format | SQL | 4 | format |
| 5 | season_id | 43b425bb-a5d1-4208-8ef4-cad26ea5e3fa | 5 | season_id |
| 6 | is_active | t | 6 | is_active |
| 7 | display_order | 1 | 7 | display_order |
| 8 | created_at | 2025-11-06 22:41:07.863375 | 8 | created_at |
| 9 | updated_at | 2025-11-06 22:41:07.863375 | 9 | updated_at |

### Sample Data
```
Row 1: Street | STR | SQL | (2025 season) | active | order 1
Row 2: Street Install | STRIN | SQL | (2025 season) | active | order 2
Row 3: Stock | STO | SQL | (2025 season) | active | order 3
```

### Import Action
- Direct import - no transformation needed

---

## 5. COMPETITION_RESULTS (COMPATIBLE - Skip state_code)

### Column Mapping
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | 45b8047c-0cbc-4137-8cf7-b82b4591885e | 1 | id |
| 2 | event_id | 72bc4755-b838-419a-9bf8-98fb01b97660 | 2 | event_id |
| 3 | competitor_id | 0a152cf5-ed05-4cad-8e5b-22c6122d1574 | 3 | competitor_id |
| 4 | competitor_name | Scott A. Smith | 4 | competitor_name |
| 5 | competition_class | DDS | 5 | competition_class |
| 6 | score | 63.00 | 6 | score |
| 7 | placement | 1 | 7 | placement |
| 8 | points_earned | 10 | 8 | points_earned |
| 9 | vehicle_info | 614/CV3D/XS Power/Klippin Hertz | 9 | vehicle_info |
| 10 | notes | Migrated from V1 (rowid: 221197) | 10 | notes |
| 11 | created_by | 3ae12d0d-e446-470b-9683-0546a85bed93 | 11 | created_by |
| 12 | created_at | 2022-05-09 18:05:27.93+00 | 12 | created_at |
| 13 | meca_id | 700057 | 13 | meca_id |
| 14 | season_id | 3349eafe-75a6-4c2c-a1f4-66d9f6bc7c47 | 14 | season_id |
| 15 | class_id | 5df0642d-abc6-4680-8d99-b0bbd688e12b | 15 | class_id |
| 16 | format | SPL | 16 | format |
| 17 | updated_by | \N | 17 | updated_by |
| 18 | updated_at | 2026-01-14 03:17:31.233+00 | 18 | updated_at |
| 19 | revision_count | 0 | 19 | revision_count |
| 20 | modification_reason | v1_migration | 20 | modification_reason |
| 21 | wattage | \N | 21 | wattage |
| 22 | frequency | \N | 22 | frequency |
| **23** | **state_code** | **\N** | **SKIP** | **(not in local)** |

### Sample Data
```
Row 1: Scott A. Smith | DDS class | 63.00 score | 1st place | 10 points | SPL format
Row 2: Randall Ritchie | DDX class | 70.00 score | 2nd place | 0 points | SPL format
Row 3: TJ Ivey | DDX class | 81.00 score | 1st place | 0 points | SPL format
```

### Import Action
- Skip dump column 23 (state_code - all NULL)
- Direct import of columns 1-22

---

## 6. MEMBERSHIPS (EXACT MATCH)

### Column Mapping (40 columns - all match)
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | 6483a8a6-20ed-49a8-a18c-c31fc84a2c2f | 1 | id |
| 2 | user_id | 3ae12d0d-e446-470b-9683-0546a85bed93 | 2 | user_id |
| 3 | purchase_date | 2025-12-07 19:23:40.541294+00 | 3 | purchase_date |
| 4 | amount_paid | 0.00 | 4 | amount_paid |
| 5 | payment_method | \N | 5 | payment_method |
| 6 | status | active | 6 | status |
| 7 | email | \N | 7 | email |
| 8 | membership_type_config_id | 854d992c-4f6f-452b-8f81-649eb10425f0 | 8 | membership_type_config_id |
| ... | ... | ... | ... | ... |
| 15 | billing_state | \N | 15 | billing_state |
| 17 | billing_country | \N | 17 | billing_country |
| 22 | start_date | 2025-12-07 19:23:40.539+00 | 22 | start_date |
| 23 | end_date | 2026-12-07 19:23:40.539+00 | 23 | end_date |
| 28 | meca_id | 202401 | 28 | meca_id |
| 36 | account_type | independent | 36 | account_type |
| 40 | linked_at | \N | 40 | linked_at |

### Sample Data
```
Membership 1: user 3ae12d0d... | active | start 2025-12-07 | end 2026-12-07 | meca_id 202401
```

### Import Action
- Direct import - no transformation needed
- **ISO Normalization needed**: billing_state, billing_country if data present

---

## 7. ORDERS (INCOMPATIBLE - Needs Decision)

### Column Comparison
| Dump Col | Dump Name | Sample Value | Local Col | Local Name |
|----------|-----------|--------------|-----------|------------|
| 1 | id | 9876a885-14cb-41cf-b3ba-04bc68f743de | 1 | id |
| 2 | order_number | ORD-2025-00001 | 2 | order_number |
| 3 | member_id | 3ae12d0d-e446-470b-9683-0546a85bed93 | 3 | member_id |
| 4 | order_type | event_registration | 4 | order_type |
| 5 | total_amount | 0.00 | 5 | total_amount |
| 6 | status | completed | 6 | status |
| 7 | payment_method | \N | 7 | payment_method |
| 8 | payment_status | unpaid | 8 | payment_status |
| 9 | payment_intent_id | \N | 9 | payment_intent_id |
| 10 | paid_at | \N | 10 | paid_at |
| 11 | notes | Event Registration - ... | 11 | notes |
| 12 | created_at | 2025-12-24 03:44:27.859+00 | 12 | created_at |
| 13 | updated_at | 2025-12-24 03:44:27.864906+00 | 13 | updated_at |
| **14** | **?** | **\N** | - | **(extra)** |
| **15** | **subtotal?** | **0.00** | - | **(extra)** |
| **16** | **tax?** | **0.00** | - | **(extra)** |
| **17** | **discount?** | **0.00** | - | **(extra)** |
| **18** | **?** | **0.00** | - | **(extra)** |
| **19** | **currency** | **USD** | - | **(extra)** |
| **20** | **billing_address** | **{JSON}** | - | **(extra)** |
| **21-26** | **?** | **\N** | - | **(extra)** |

### Sample Data
```
Order 1: ORD-2025-00001 | event_registration | $0.00 | completed | unpaid
         billing_address: {"city": "Perry", "name": "James Ryan", "state": "FL", "country": "US", ...}
```

### Options
1. **Import first 13 columns only** - discard extra data (subtotal, tax, currency, billing_address)
2. **Skip orders entirely** - if extra columns contain important data
3. **Add missing columns to local schema** - if data is needed

### Recommendation
The extra columns (14-26) include financial details (subtotal, tax, discount, currency) and billing address JSON. These may be useful for historical records but are not in the current schema.

**Decision needed from user.**

---

## ISO Normalization Requirements

### Fields Requiring Normalization

| Table | Field | Current Values | Target (ISO) |
|-------|-------|----------------|--------------|
| profiles | billing_country | USA | US |
| profiles | shipping_country | USA | US |
| profiles | country | US | US (OK) |
| profiles | state | PA, FL, etc. | (OK - 2-letter) |
| events | venue_country | US | US (OK) |
| events | venue_state | FL, NV, etc. | (OK - 2-letter) |
| memberships | billing_country | (check data) | US |
| memberships | billing_state | (check data) | 2-letter |

### Database Default Changes Needed

| Table | Column | Current Default | New Default |
|-------|--------|-----------------|-------------|
| profiles | billing_country | 'USA' | 'US' |
| profiles | shipping_country | 'USA' | 'US' |
| event_hosting_requests | country | 'United States' | 'US' |

---

## Import Order (Respecting Foreign Keys)

1. **seasons** (no dependencies)
2. **competition_classes** (depends on seasons)
3. **profiles** (no dependencies)
4. **events** (depends on seasons)
5. **memberships** (depends on profiles, membership_type_configs)
6. **competition_results** (depends on events, profiles, competition_classes)
7. **orders** (depends on profiles) - *pending decision*

---

## Total Records to Import

| Table | Records |
|-------|---------|
| seasons | 9 |
| events | 964 |
| competition_classes | 277 |
| profiles | 4,154 |
| memberships | 4,150 |
| competition_results | 35,037 |
| orders | 1,248 (pending) |
| **TOTAL** | **~45,839** |
