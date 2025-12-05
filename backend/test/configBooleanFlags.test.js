const test = require('node:test');
const assert = require('assert');

const configPath = require.resolve('../src/config');
const reminderServicePath = require.resolve('../src/services/reminderService');
const vehicleServicePath = require.resolve('../src/services/vehicleComplianceService');

const dbStub = {
  collection: () => ({
    find: () => ({ toArray: async () => [] }),
    updateOne: async () => {},
  }),
};

function withEnv(env, fn) {
  const keys = Object.keys(env);
  const previous = {};

  for (const key of keys) {
    previous[key] = process.env[key];
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

function clearModules() {
  delete require.cache[configPath];
  delete require.cache[reminderServicePath];
  delete require.cache[vehicleServicePath];
}

function mockTimers() {
  const calls = {
    setTimeout: [],
    setInterval: [],
  };

  const original = {
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
  };

  global.setTimeout = (fn, delay) => {
    calls.setTimeout.push(delay);
    return { type: 'timeout', fn };
  };
  global.clearTimeout = () => {};
  global.setInterval = (fn, delay) => {
    calls.setInterval.push(delay);
    return { type: 'interval', fn };
  };
  global.clearInterval = () => {};

  return { calls, restore: () => Object.assign(global, original) };
}

test('strict boolean env parsing for schedules', async (t) => {
  await t.test('string "true" keeps schedules enabled', () => {
    withEnv(
      {
        JWT_SECRET: 'test-secret',
        LOAN_REMINDER_DAILY_SCHEDULE_ENABLED: 'true',
        LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED: 'true',
        VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED: 'true',
      },
      () => {
        clearModules();
        const config = require('../src/config');
        assert.strictEqual(config.LOAN_REMINDER_DAILY_SCHEDULE_ENABLED, true);
        assert.strictEqual(config.LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED, true);
        assert.strictEqual(config.VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED, true);
      },
    );
  });

  await t.test('string "false" disables schedules', () => {
    withEnv(
      {
        JWT_SECRET: 'test-secret',
        LOAN_REMINDER_DAILY_SCHEDULE_ENABLED: 'false',
        LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED: 'false',
        VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED: 'false',
      },
      () => {
        clearModules();
        const config = require('../src/config');
        assert.strictEqual(config.LOAN_REMINDER_DAILY_SCHEDULE_ENABLED, false);
        assert.strictEqual(config.LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED, false);
        assert.strictEqual(config.VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED, false);
      },
    );
  });
});

test('schedulers honour strict boolean flags', async (t) => {
  await t.test('loan reminder daily and fallback schedules can be disabled', () => {
    withEnv(
      {
        JWT_SECRET: 'test-secret',
        LOAN_REMINDER_DAILY_SCHEDULE_ENABLED: 'false',
        LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED: 'false',
      },
      () => {
        clearModules();
        const timers = mockTimers();
        const { scheduleLoanReminders } = require('../src/services/reminderService');

        const schedule = scheduleLoanReminders(dbStub);
        schedule.cancel();
        timers.restore();

        assert.deepStrictEqual(timers.calls.setTimeout, []);
        assert.deepStrictEqual(timers.calls.setInterval, []);
      },
    );
  });

  await t.test('loan reminder daily and fallback schedules can be enabled', () => {
    withEnv(
      {
        JWT_SECRET: 'test-secret',
        LOAN_REMINDER_DAILY_SCHEDULE_ENABLED: 'true',
        LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED: 'true',
      },
      () => {
        clearModules();
        const timers = mockTimers();
        const { scheduleLoanReminders } = require('../src/services/reminderService');

        const schedule = scheduleLoanReminders(dbStub);
        schedule.cancel();
        timers.restore();

        assert.strictEqual(timers.calls.setTimeout.length, 1);
        assert.strictEqual(timers.calls.setInterval.length, 1);
      },
    );
  });

  await t.test('vehicle compliance daily schedule can be toggled', () => {
    withEnv(
      {
        JWT_SECRET: 'test-secret',
        VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED: 'false',
      },
      () => {
        clearModules();
        const timers = mockTimers();
        const { scheduleVehicleComplianceReminders } = require('../src/services/vehicleComplianceService');

        const schedule = scheduleVehicleComplianceReminders(dbStub);
        schedule.cancel();
        timers.restore();

        assert.deepStrictEqual(timers.calls.setTimeout, []);
        assert.strictEqual(timers.calls.setInterval.length, 1);
      },
    );

    withEnv(
      {
        JWT_SECRET: 'test-secret',
        VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED: 'true',
      },
      () => {
        clearModules();
        const timers = mockTimers();
        const { scheduleVehicleComplianceReminders } = require('../src/services/vehicleComplianceService');

        const schedule = scheduleVehicleComplianceReminders(dbStub);
        schedule.cancel();
        timers.restore();

        assert.strictEqual(timers.calls.setTimeout.length, 1);
        assert.strictEqual(timers.calls.setInterval.length, 1);
      },
    );
  });
});
