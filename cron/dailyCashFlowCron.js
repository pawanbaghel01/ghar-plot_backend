import cron from "node-cron";
import Employee from "../models/employeeSchema.js";
import CashFlow from "../models/cashFlowSchema.js";
import Expense from "../models/expenseSchema.js";

let isRunning = false;

// Helper: Get UTC midnight Date for current day in Asia/Kolkata timezone
export const getTodayISTDate = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const istDateStr = formatter.format(new Date()); // YYYY-MM-DD
  const [year, month, day] = istDateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

// Helper: Add days to a Date (UTC safe)
const addDaysUTC = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

/**
 * Ensure an employee has continuous daily cash flow records up to targetDate.
 * If there are gaps between the last record and targetDate, fill each missing day
 * carrying over the closing balance as the next day's opening balance.
 */
export const ensureEmployeeCashFlowUpToDate = async (employeeId, targetDate = getTodayISTDate()) => {
  try {
    const targetTime = targetDate.getTime();

    // Check if targetDate entry already exists
    const startOfTarget = new Date(targetDate);
    startOfTarget.setUTCHours(0, 0, 0, 0);
    const endOfTarget = new Date(targetDate);
    endOfTarget.setUTCHours(23, 59, 59, 999);

    const existingToday = await CashFlow.findOne({
      businessAssociate: employeeId,
      date: { $gte: startOfTarget, $lte: endOfTarget },
    });

    // Find the latest CashFlow strictly before startOfTarget
    const lastCashFlow = await CashFlow.findOne({
      businessAssociate: employeeId,
      date: { $lt: startOfTarget },
    }).sort({ date: -1 });

    // If employee has no records at all, create an initial record for today with 0 balance
    if (!lastCashFlow) {
      if (!existingToday) {
        // Check if any expenses already exist for today
        const dailyExpenses = await Expense.find({
          businessAssociate: employeeId,
          date: { $gte: startOfTarget, $lte: endOfTarget },
        });
        const totalExpense = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const newInitial = new CashFlow({
          businessAssociate: employeeId,
          date: startOfTarget,
          openingBalance: 0,
          entries: [],
          totalReceived: 0,
          totalExpense,
          closingBalance: 0 - totalExpense,
        });
        await newInitial.save();
        console.log(`[DailyCashFlow] Created initial record for employee ${employeeId} on ${startOfTarget.toISOString().split("T")[0]}`);
      }
      return;
    }

    // Determine start date for backfilling (day after lastCashFlow)
    let currentStepDate = new Date(lastCashFlow.date);
    currentStepDate.setUTCHours(0, 0, 0, 0);
    currentStepDate = addDaysUTC(currentStepDate, 1);

    let runningClosingBalance = lastCashFlow.closingBalance || 0;

    // Iterate day by day from (lastCashFlow + 1 day) up to targetDate
    // Safety cap at 365 days max to prevent infinite loops
    let iteration = 0;
    while (currentStepDate.getTime() <= targetTime && iteration < 365) {
      iteration++;
      const stepStart = new Date(currentStepDate);
      stepStart.setUTCHours(0, 0, 0, 0);
      const stepEnd = new Date(currentStepDate);
      stepEnd.setUTCHours(23, 59, 59, 999);

      let cfRecord = await CashFlow.findOne({
        businessAssociate: employeeId,
        date: { $gte: stepStart, $lte: stepEnd },
      });

      if (!cfRecord) {
        // Find if any expenses exist for this missing date
        const stepExpenses = await Expense.find({
          businessAssociate: employeeId,
          date: { $gte: stepStart, $lte: stepEnd },
        });
        const totalExpense = stepExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const closingBalance = runningClosingBalance - totalExpense;

        cfRecord = new CashFlow({
          businessAssociate: employeeId,
          date: stepStart,
          openingBalance: runningClosingBalance,
          entries: [],
          totalReceived: 0,
          totalExpense,
          closingBalance,
        });
        await cfRecord.save();
        console.log(
          `[DailyCashFlow] Auto-created entry for associate ${employeeId} on ${
            stepStart.toISOString().split("T")[0]
          } (Op: ${runningClosingBalance}, Cl: ${closingBalance})`
        );
      }

      runningClosingBalance = cfRecord.closingBalance || 0;
      currentStepDate = addDaysUTC(currentStepDate, 1);
    }
  } catch (err) {
    console.error(`[DailyCashFlow] Error processing employee ${employeeId}:`, err);
  }
};

/**
 * Process all active employees to ensure today's cashflow record exists.
 */
export const ensureTodayCashFlowsExist = async () => {
  if (isRunning) {
    console.log("[DailyCashFlow] Auto-entry job already running, skipping duplicate run.");
    return;
  }

  isRunning = true;
  try {
    const today = getTodayISTDate();
    console.log(`[DailyCashFlow] Running auto-entry check for today (IST): ${today.toISOString().split("T")[0]}`);

    const activeEmployees = await Employee.find({ isActive: { $ne: false } }).select("_id name");
    console.log(`[DailyCashFlow] Found ${activeEmployees.length} active employees to verify.`);

    for (const emp of activeEmployees) {
      await ensureEmployeeCashFlowUpToDate(emp._id, today);
    }

    console.log(`[DailyCashFlow] Finished auto-entry check for all employees.`);
  } catch (err) {
    console.error("[DailyCashFlow] Error running ensureTodayCashFlowsExist:", err);
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize Midnight Cron Job (runs at 00:01 AM IST every day)
 */
export const initDailyCashFlowCron = () => {
  console.log("⏰ Daily CashFlow cron initialized (00:01 AM IST)");

  // Run at 00:01 AM every day in Indian Standard Time (Asia/Kolkata)
  cron.schedule(
    "1 0 * * *",
    async () => {
      console.log("⏰ [DailyCashFlowCron] 00:01 AM IST triggered - generating daily cash flows...");
      await ensureTodayCashFlowsExist();
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );

  // Also run an immediate check on startup to ensure today's entry is available
  setTimeout(() => {
    ensureTodayCashFlowsExist().catch((err) =>
      console.error("[DailyCashFlowCron] Startup check failed:", err)
    );
  }, 3000);
};

export default {
  initDailyCashFlowCron,
  ensureTodayCashFlowsExist,
  ensureEmployeeCashFlowUpToDate,
  getTodayISTDate,
};
