const fs = require('fs');
const { faker } = require('@faker-js/faker');

// Generate large CSV for testing
function generateTestCSV(rows = 100000) {
  const headers = 'policy_number,insured_name,premium_amount,effective_date,status\n';
  let csv = headers;

  for (let i = 0; i < rows; i++) {
    csv += `POL${String(i + 1).padStart(8, '0')},`;
    csv += `"${faker.person.fullName()}",`;
    csv += `${faker.finance.amount(1000, 100000, 2)},`;
    csv += `${faker.date.past().toISOString().split('T')[0]},`;
    csv += `${faker.helpers.arrayElement(['ACTIVE', 'PENDING', 'EXPIRED'])}\n`;

    // Write in chunks to avoid memory issues
    if (i % 10000 === 0) {
      fs.appendFileSync('test-data-large.csv', csv);
      csv = '';
      console.log(`Generated ${i} rows...`);
    }
  }

  if (csv) {
    fs.appendFileSync('test-data-large.csv', csv);
  }

  console.log(`Done! Generated ${rows} rows.`);
}

// Run with: node scripts/generate-test-data.js
if (!fs.existsSync('test-data-large.csv')) {
  fs.writeFileSync('test-data-large.csv', '');
}
generateTestCSV(100000);