# Leave Balance APIs

Base URL: `/v1/leave-balances`

## Create allocation

`POST /v1/leave-balances` (management roles only)

```json
{
  "employeeId": "...",
  "leaveType": "Casual Leave",
  "year": 2026,
  "allocated": 12,
  "isPaid": true,
  "requiresBalance": true
}
```

There are no default allocations. `used` starts at zero and `remaining` is derived as `allocated - used`.

## Update allocation

`PATCH /v1/leave-balances/:balanceId` (management roles only)

Only `allocated`, `isPaid`, and `requiresBalance` can be changed. `allocated` cannot be reduced below `used`; `used` and `remaining` are not client-editable.

## View employee balances

`GET /v1/leave-balances/employee/:employeeId?year=2026`

Employees may view their own balances. Management roles may view any employee, including soft-deleted employee history.

Approved half-day leave consumes `0.5`. Unpaid leave does not require a positive balance. No carry-forward, accrual, encashment, or Comp-Off earning is implemented.

Leave request listing uses `/v1/leave-requests` for management and `/v1/leave-requests/employee/:employeeId` for employee history. Supported filters include `status`, `employeeId`, `leaveType`, `search`, `fromDate`, `toDate`, and `year`, with pagination fields `results`, `page`, `limit`, `totalPages`, and `totalResults`. Date filters match any single-day or range request overlapping the requested period. Legacy `ended` remains distinct from `rejected`; half-day responses expose `leaveDuration` and `halfDaySession`.

Approved leave may be cancelled by the requester or management with a required cancellation reason. New approvals store exact per-year `balanceUsage`; cancellation restores those amounts, including half-days and cross-year entries. Legacy approved requests without usage metadata cannot be automatically restored and require manual reconciliation.
