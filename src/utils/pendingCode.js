/**
 * In-memory store for pending generated codes.
 * Prevents issuing a new code until the previous one has been saved to the DB.
 *
 * Usage:
 *   setPending(type, code)       — store a newly generated code
 *   getPending(type)             — get the current pending code (or null)
 *   clearPending(type)           — clear after confirmed saved
 *   isPendingConsumed(type, checkFn) — returns true if the pending code is now in DB
 */

const pending = {};

const setPending = (type, code) => {
  pending[type] = code;
};

const getPending = (type) => pending[type] || null;

const clearPending = (type) => {
  pending[type] = null;
};

module.exports = { setPending, getPending, clearPending };
