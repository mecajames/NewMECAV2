@echo off
setlocal enabledelayedexpansion

set API_BASE_URL=http://localhost:3001
set SEASON_2025_ID=43b425bb-a5d1-4208-8ef4-cad26ea5e3fa

echo Starting to add classes...
echo.
echo === Adding SQL Classes ===

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"TR\",\"abbreviation\":\"TR\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":1}"
echo Added: TR

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Extreme Install\",\"abbreviation\":\"XTRIN\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":2}"
echo Added: Extreme Install

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Master\",\"abbreviation\":\"MSTR\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":3}"
echo Added: Master

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Modified\",\"abbreviation\":\"MOD\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":4}"
echo Added: Modified

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Modified Install\",\"abbreviation\":\"MOINS\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":5}"
echo Added: Modified Install

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Modified Street\",\"abbreviation\":\"MS\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":6}"
echo Added: Modified Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"RTA\",\"abbreviation\":\"RTA\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":7}"
echo Added: RTA

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"SQ2\",\"abbreviation\":\"SQ2\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":8}"
echo Added: SQ2

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"SQ2+\",\"abbreviation\":\"SQ2P\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":9}"
echo Added: SQ2+

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Stock\",\"abbreviation\":\"STO\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":10}"
echo Added: Stock

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Stock Install\",\"abbreviation\":\"STOIN\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":11}"
echo Added: Stock Install

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Street\",\"abbreviation\":\"STR\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":12}"
echo Added: Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Street Install\",\"abbreviation\":\"STRIN\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":13}"
echo Added: Street Install

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Extreme\",\"abbreviation\":\"X\",\"format\":\"SQL\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":14}"
echo Added: Extreme

echo.
echo === Adding Show and Shine Classes ===

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Bicycle\",\"abbreviation\":\"BICYC\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":1}"
echo Added: Bicycle

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Mild\",\"abbreviation\":\"SSDCM\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":2}"
echo Added: Domestic Car Mild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Street\",\"abbreviation\":\"SSDCS\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":3}"
echo Added: Domestic Car Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Domestic Car Wild\",\"abbreviation\":\"SSDCW\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":4}"
echo Added: Domestic Car Wild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"European Mild\",\"abbreviation\":\"SSEM\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":5}"
echo Added: European Mild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"European Street\",\"abbreviation\":\"SSES\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":6}"
echo Added: European Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"European Wild\",\"abbreviation\":\"SSEW\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":7}"
echo Added: European Wild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Import Car Mild\",\"abbreviation\":\"SSICM\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":8}"
echo Added: Import Car Mild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Import Car Street\",\"abbreviation\":\"SSICS\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":9}"
echo Added: Import Car Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Import Car Wild\",\"abbreviation\":\"SSICW\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":10}"
echo Added: Import Car Wild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Motorcycle\",\"abbreviation\":\"MOTO\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":11}"
echo Added: Motorcycle

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Open\",\"abbreviation\":\"SSO\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":12}"
echo Added: Open

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Show and Shine MECA Kids\",\"abbreviation\":\"SSMK\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":13}"
echo Added: Show and Shine MECA Kids

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Mild\",\"abbreviation\":\"SUVM\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":14}"
echo Added: SUV/Van Mild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Street\",\"abbreviation\":\"SUVS\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":15}"
echo Added: SUV/Van Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"SUV/Van Wild\",\"abbreviation\":\"SUVW\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":16}"
echo Added: SUV/Van Wild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Truck Mild\",\"abbreviation\":\"SSTM\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":17}"
echo Added: Truck Mild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Truck Street\",\"abbreviation\":\"SSTS\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":18}"
echo Added: Truck Street

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Truck Wild\",\"abbreviation\":\"SSTW\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":19}"
echo Added: Truck Wild

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Vintage Car\",\"abbreviation\":\"SSVC\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":20}"
echo Added: Vintage Car

curl -X POST %API_BASE_URL%/api/competition-classes -H "Content-Type: application/json" -d "{\"name\":\"Vintage Truck\",\"abbreviation\":\"SSVT\",\"format\":\"Show and Shine\",\"season_id\":\"%SEASON_2025_ID%\",\"is_active\":true,\"display_order\":21}"
echo Added: Vintage Truck

echo.
echo === Complete ===
echo All classes have been added successfully!
