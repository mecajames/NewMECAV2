#!/bin/bash

API_BASE_URL="http://localhost:3001"
SEASON_2025_ID="43b425bb-a5d1-4208-8ef4-cad26ea5e3fa"

echo "Starting to add classes..."
echo ""
echo "=== Adding SQL Classes ==="

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"TR\",\"abbreviation\":\"TR\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":1}" > /dev/null
echo "✓ Added: TR"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Extreme Install\",\"abbreviation\":\"XTRIN\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":2}" > /dev/null
echo "✓ Added: Extreme Install"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Master\",\"abbreviation\":\"MSTR\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":3}" > /dev/null
echo "✓ Added: Master"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Modified\",\"abbreviation\":\"MOD\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":4}" > /dev/null
echo "✓ Added: Modified"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Modified Install\",\"abbreviation\":\"MOINS\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":5}" > /dev/null
echo "✓ Added: Modified Install"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Modified Street\",\"abbreviation\":\"MS\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":6}" > /dev/null
echo "✓ Added: Modified Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"RTA\",\"abbreviation\":\"RTA\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":7}" > /dev/null
echo "✓ Added: RTA"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"SQ2\",\"abbreviation\":\"SQ2\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":8}" > /dev/null
echo "✓ Added: SQ2"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"SQ2+\",\"abbreviation\":\"SQ2P\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":9}" > /dev/null
echo "✓ Added: SQ2+"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Stock\",\"abbreviation\":\"STO\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":10}" > /dev/null
echo "✓ Added: Stock"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Stock Install\",\"abbreviation\":\"STOIN\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":11}" > /dev/null
echo "✓ Added: Stock Install"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Street\",\"abbreviation\":\"STR\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":12}" > /dev/null
echo "✓ Added: Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Street Install\",\"abbreviation\":\"STRIN\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":13}" > /dev/null
echo "✓ Added: Street Install"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Extreme\",\"abbreviation\":\"X\",\"format\":\"SQL\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":14}" > /dev/null
echo "✓ Added: Extreme"

echo ""
echo "=== Adding Show and Shine Classes ==="

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Bicycle\",\"abbreviation\":\"BICYC\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":1}" > /dev/null
echo "✓ Added: Bicycle"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Mild\",\"abbreviation\":\"SSDCM\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":2}" > /dev/null
echo "✓ Added: Domestic Car Mild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Street\",\"abbreviation\":\"SSDCS\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":3}" > /dev/null
echo "✓ Added: Domestic Car Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Wild\",\"abbreviation\":\"SSDCW\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":4}" > /dev/null
echo "✓ Added: Domestic Car Wild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"European Mild\",\"abbreviation\":\"SSEM\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":5}" > /dev/null
echo "✓ Added: European Mild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"European Street\",\"abbreviation\":\"SSES\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":6}" > /dev/null
echo "✓ Added: European Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"European Wild\",\"abbreviation\":\"SSEW\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":7}" > /dev/null
echo "✓ Added: European Wild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Import Car Mild\",\"abbreviation\":\"SSICM\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":8}" > /dev/null
echo "✓ Added: Import Car Mild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Import Car Street\",\"abbreviation\":\"SSICS\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":9}" > /dev/null
echo "✓ Added: Import Car Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Import Car Wild\",\"abbreviation\":\"SSICW\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":10}" > /dev/null
echo "✓ Added: Import Car Wild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Motorcycle\",\"abbreviation\":\"MOTO\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":11}" > /dev/null
echo "✓ Added: Motorcycle"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Open\",\"abbreviation\":\"SSO\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":12}" > /dev/null
echo "✓ Added: Open"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Show and Shine MECA Kids\",\"abbreviation\":\"SSMK\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":13}" > /dev/null
echo "✓ Added: Show and Shine MECA Kids"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Mild\",\"abbreviation\":\"SUVM\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":14}" > /dev/null
echo "✓ Added: SUV/Van Mild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Street\",\"abbreviation\":\"SUVS\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":15}" > /dev/null
echo "✓ Added: SUV/Van Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Wild\",\"abbreviation\":\"SUVW\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":16}" > /dev/null
echo "✓ Added: SUV/Van Wild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Truck Mild\",\"abbreviation\":\"SSTM\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":17}" > /dev/null
echo "✓ Added: Truck Mild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Truck Street\",\"abbreviation\":\"SSTS\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":18}" > /dev/null
echo "✓ Added: Truck Street"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Truck Wild\",\"abbreviation\":\"SSTW\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":19}" > /dev/null
echo "✓ Added: Truck Wild"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Vintage Car\",\"abbreviation\":\"SSVC\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":20}" > /dev/null
echo "✓ Added: Vintage Car"

curl -s -X POST "$API_BASE_URL/api/competition-classes" -H "Content-Type: application/json" -d "{\"name\":\"Vintage Truck\",\"abbreviation\":\"SSVT\",\"format\":\"Show and Shine\",\"season_id\":\"$SEASON_2025_ID\",\"is_active\":true,\"display_order\":21}" > /dev/null
echo "✓ Added: Vintage Truck"

echo ""
echo "=== Complete ==="
echo "All 35 classes have been added successfully!"
echo "- 14 SQL classes"
echo "- 21 Show and Shine classes"
