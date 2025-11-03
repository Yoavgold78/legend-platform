import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeFiles = [
  'upload.js',
  'templates.js', 
  'tasks.js',
  'stores.js',
  'inspections.js',
  'checklistInstances.js',
  'checklists.js',
  'audits.js'
];

routeFiles.forEach(file => {
  const filePath = path.join(__dirname, 'routes', file);
  console.log(`Updating ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import
  content = content.replace(
    "import { protect } from '../middleware/auth.js';",
    "// TEMPORARY: Using simple auth for testing\nimport { protect } from '../middleware/authSimple.js';"
  );
  
  content = content.replace(
    "import { protect, admin } from '../middleware/auth.js';",
    "// TEMPORARY: Using simple auth for testing\nimport { protect, admin } from '../middleware/authSimple.js';"
  );
  
  // Handle the stores.js comment
  content = content.replace(
    "import { protect, admin } from '../middleware/auth.js'; // Note the added '.js' extension",
    "// TEMPORARY: Using simple auth for testing\nimport { protect, admin } from '../middleware/authSimple.js';"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});

console.log('All route files updated!');