import * as fs from 'fs';

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: npm run migrate:make <migration_name>');
  process.exit(1);
}

const template = `import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  
}

export async function down(db: Kysely<any>): Promise<void> {
  
}
`;

const migrationFolder = `${__dirname}/../migrations`;

if (!fs.existsSync(migrationFolder)) {
  fs.mkdirSync(migrationFolder);
}
const fileName = `${new Date().toISOString().replace(/[-T:]|\.\d+Z/g, '')}_${migrationName}.ts`;
const migrationFile = `${migrationFolder}/${fileName}`;

fs.writeFileSync(migrationFile, template);

console.log(`Migration ${fileName} created successfully`);
