import * as fs from 'fs';

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: npm run migrate:make-sql <migration_name>');
  process.exit(1);
}

const migrationFolder = `${__dirname}/../migrations`;

if (!fs.existsSync(migrationFolder)) {
  fs.mkdirSync(migrationFolder);
}
const fileName = `${new Date().toISOString().replace(/[-T:]|\.\d+Z/g, '')}_${migrationName}.sql`;
const migrationFile = `${migrationFolder}/${fileName}`;

fs.writeFileSync(migrationFile, '');

console.log(`Migration ${fileName} created successfully`);
