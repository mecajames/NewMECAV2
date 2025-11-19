const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const excelPath = 'e:\\MECA Oct 2025\\3750.spl-world-finals.MecaEventResults.xlsx';
const workbook = XLSX.readFile(excelPath);

console.log('Sheet Names:', workbook.SheetNames);

// Read each sheet
workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Show first 10 rows
  console.log('First 10 rows:');
  data.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index + 1}:`, row);
  });

  // Also show as JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  console.log('\nFirst 3 rows as JSON:');
  console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));
});
