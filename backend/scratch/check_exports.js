import * as apiController from '../controllers/apiController.js';

console.log('--- Checking apiController Exports ---');
console.log('suspendCompany:', typeof apiController.suspendCompany);
console.log('updateCardCustomization:', typeof apiController.updateCardCustomization);
console.log('getCardCustomization:', typeof apiController.getCardCustomization);
console.log('reactivateCompany:', typeof apiController.reactivateCompany);
console.log('deleteCompany:', typeof apiController.deleteCompany);
console.log('---------------------------------------');

if (!apiController.suspendCompany) {
  console.error('❌ ERROR: suspendCompany is undefined!');
}
if (!apiController.updateCardCustomization) {
  console.error('❌ ERROR: updateCardCustomization is undefined!');
}
process.exit();
