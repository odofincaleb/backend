// Fix for campaigns.js syntax error
// This script removes any orphaned code after module.exports

const fs = require('fs');
const path = require('path');

const campaignsPath = path.join(__dirname, 'src/routes/campaigns.js');

try {
  let content = fs.readFileSync(campaignsPath, 'utf8');
  
  // Find the module.exports line
  const moduleExportIndex = content.indexOf('module.exports = router;');
  
  if (moduleExportIndex !== -1) {
    // Keep only up to and including the module.exports line
    const cleanContent = content.substring(0, moduleExportIndex + 'module.exports = router;'.length);
    
    // Write the clean content back
    fs.writeFileSync(campaignsPath, cleanContent);
    console.log('✅ Fixed campaigns.js - removed orphaned code');
  } else {
    console.log('❌ Could not find module.exports in campaigns.js');
  }
} catch (error) {
  console.error('❌ Error fixing campaigns.js:', error.message);
}
