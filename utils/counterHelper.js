import Counter from "../models/counterSchema.js";

/**
 * Get next integer sequence for a counter name atomically
 * @param {string} name - e.g. 'client', 'employee'
 * @returns {Promise<number>}
 */
export const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

/**
 * Generate a unique Client Code like CL01, CL02, ... CL10, etc.
 * @returns {Promise<string>}
 */
export const generateClientCode = async () => {
  const seq = await getNextSequence("client");
  return `CL${String(seq).padStart(2, "0")}`;
};

/**
 * Generate a unique Employee Code like EMP01, EMP02, ... EMP10, etc.
 * @returns {Promise<string>}
 */
export const generateEmployeeCode = async () => {
  const seq = await getNextSequence("employee");
  return `EMP${String(seq).padStart(2, "0")}`;
};

