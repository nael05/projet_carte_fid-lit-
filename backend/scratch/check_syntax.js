const fs = require('fs');
const files = ['backend/controllers/apiController.js', 'backend/controllers/appleWebserviceController.js', 'backend/utils/passGenerator.js'];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const tryCount = (content.match(/try\s*\{/g) || []).length;
  const catchCount = (content.match(/catch\s*\(.*?\)\s*\{/g) || []).length;
  const finallyCount = (content.match(/finally\s*\{/g) || []).length;
  console.log(`${file}: try=${tryCount}, catch=${catchCount}, finally=${finallyCount}`);
});
