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
  'audits.js',
  'auth.js'
];

routeFiles.forEach(file => {
  const filePath = path.join(__dirname, 'routes', file);
  console.log(`Restoring ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Restore the original import
  content = content.replace(
    "// TEMPORARY: Using simple auth for testing\nimport { protect } from '../middleware/authSimple.js';",
    "import { protect } from '../middleware/auth.js';"
  );
  
  content = content.replace(
    "// TEMPORARY: Using simple auth for testing\nimport { protect, admin } from '../middleware/authSimple.js';",
    "import { protect, admin } from '../middleware/auth.js';"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Restored ${file}`);
});

console.log('All route files restored to use original Auth0 middleware!');