const test = require('node:test');
const assert = require('node:assert/strict');
const { mergePreferences } = require('../src/models/User');

test('existing loan opt-outs carry over to vehicle notices until independently changed', () => {
  const oldPreferences = {
    emailNotifications: {
      loanRequests: false,
      loanStatusChanges: false,
      returnReminders: false,
    },
  };
  const merged = mergePreferences(undefined, oldPreferences);
  assert.equal(merged.emailNotifications.vehicleRequests, false);
  assert.equal(merged.emailNotifications.vehicleStatusChanges, false);
  assert.equal(merged.emailNotifications.vehicleBookingReminders, false);

  const updated = mergePreferences(
    { emailNotifications: { vehicleRequests: true } },
    oldPreferences,
  );
  assert.equal(updated.emailNotifications.loanRequests, false);
  assert.equal(updated.emailNotifications.vehicleRequests, true);
});

test('legacy structure-wide opt-out still covers new vehicle categories', () => {
  const merged = mergePreferences(undefined, {
    emailNotifications: { structureUpdates: false },
  });
  assert.equal(merged.emailNotifications.loanRequests, false);
  assert.equal(merged.emailNotifications.vehicleRequests, false);
  assert.equal(merged.emailNotifications.vehicleReminders, false);
  assert.equal(merged.emailNotifications.annualReports, true);
});

test('an existing system alert opt-out carries over to annual reports', () => {
  const merged = mergePreferences(undefined, {
    emailNotifications: { systemAlerts: false },
  });
  assert.equal(merged.emailNotifications.annualReports, false);
});
