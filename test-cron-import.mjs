// Test file to check if reminderCron imports correctly
try {
    console.log('🧪 Testing reminderCron.js import...');
    await import('./cron/reminderCron.js');
    console.log('✅ reminderCron.js imported successfully!');
} catch (error) {
    console.error('❌ Error importing reminderCron.js:', error.message);
    console.error('Stack:', error.stack);
}
