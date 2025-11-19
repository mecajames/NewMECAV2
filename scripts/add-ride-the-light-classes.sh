#!/bin/bash

API_BASE_URL="http://localhost:3001"
SEASON_2025_ID="43b425bb-a5d1-4208-8ef4-cad26ea5e3fa"

echo "Starting to add Ride the Light classes..."
echo ""
echo "=== Adding Ride the Light Classes ==="

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Exterior\",\"abbreviation\":\"RTLEX\",\"format\":\"Ride the Light\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":1}" > /dev/null
echo "✓ Added: Exterior (RTLEX)"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Interior\",\"abbreviation\":\"RTLIN\",\"format\":\"Ride the Light\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":2}" > /dev/null
echo "✓ Added: Interior (RTLIN)"

echo ""
echo "=== Complete ==="
echo "All 2 Ride the Light classes have been added successfully!"
