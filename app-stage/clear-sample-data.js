// Utility script to clear sample data and test deletion functionality
// Run this in the browser console to clear sample data

console.log('🔧 Clearing sample data and testing deletion functionality...');

// Get the DatabaseManager instance
const dbManager = new DatabaseManager();

// Check current data
console.log('📊 Current data before clearing:');
console.log('Candidates:', dbManager.getAllCandidates().length);
console.log('Formations:', dbManager.getAllFormations().length);
console.log('Payments:', dbManager.getAllPayments().length);

// Clear sample data
dbManager.clearSampleData();

// Test deletion methods
console.log('\n🧪 Testing deletion methods...');

// Test candidate deletion
const candidates = dbManager.getAllCandidates();
if (candidates.length > 0) {
  const candidateToDelete = candidates[0];
  console.log(`🗑️ Deleting candidate: ${candidateToDelete.firstName} ${candidateToDelete.lastName}`);
  const candidateDeleted = dbManager.deleteCandidate(candidateToDelete.id);
  console.log('Candidate deletion result:', candidateDeleted);
}

// Test formation deletion
const formations = dbManager.getAllFormations();
if (formations.length > 0) {
  const formationToDelete = formations[0];
  console.log(`🗑️ Deleting formation: ${formationToDelete.title}`);
  const formationDeleted = dbManager.deleteFormation(formationToDelete.id);
  console.log('Formation deletion result:', formationDeleted);
}

// Test payment deletion
const payments = dbManager.getAllPayments();
if (payments.length > 0) {
  const paymentToDelete = payments[0];
  console.log(`🗑️ Deleting payment: ${paymentToDelete.amount} TND`);
  const paymentDeleted = dbManager.deletePayment(paymentToDelete.id);
  console.log('Payment deletion result:', paymentDeleted);
}

// Check data after deletion
console.log('\n📊 Data after deletion:');
console.log('Candidates:', dbManager.getAllCandidates().length);
console.log('Formations:', dbManager.getAllFormations().length);
console.log('Payments:', dbManager.getAllPayments().length);

// Force reset to test if sample data comes back
console.log('\n🔄 Testing if sample data comes back after reset...');
dbManager.forceResetAllData();

console.log('\n📊 Data after reset:');
console.log('Candidates:', dbManager.getAllCandidates().length);
console.log('Formations:', dbManager.getAllFormations().length);
console.log('Payments:', dbManager.getAllPayments().length);

console.log('\n✅ Test completed! Check the console for results.');
console.log('💡 If deletion worked, the counts should be 0 after deletion and increase after reset.');
