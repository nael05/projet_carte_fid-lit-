#!/bin/bash
# Script to clean up console logs in controllers
# Usage: bash clean-console-logs.sh

echo "Cleaning console.log from apiController.js..."
# Replace console.error(err) with logger.error
sed -i "s/console\.error(err);/logger.error('API error', { error: err.message });/g" backend/controllers/apiController.js

# Replace console.log with appropriate logger
sed -i "s/console\.log(/logger.info(/g" backend/controllers/apiController.js

echo "Cleaning console.log from loyaltyController.js..."
sed -i "s/console\.error(err);/logger.error('Loyalty error', { error: err.message });/g" backend/controllers/loyaltyController.js
sed -i "s/console\.log(/logger.info(/g" backend/controllers/loyaltyController.js

echo "Cleaning console.log from other utils..."
find backend/utils -name "*.js" -exec sed -i "s/console\.error(/logger.error(/g" {} \;
find backend/utils -name "*.js" -exec sed -i "s/console\.log(/logger.info(/g" {} \;

echo "✅ Console logs cleaned!"
