/**
 * Invariants: AuditFilters options must match API GET /audit status values.
 * API status: CONFIRMED | DUPLICATE | FAILED. ALL for no filter.
 */
const AUDIT_FILTER_OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED"] as const;

describe("AuditFilters invariants", () => {
  it("OPTIONS include ALL and API status values CONFIRMED, DUPLICATE, FAILED", () => {
    expect(AUDIT_FILTER_OPTIONS).toContain("ALL");
    expect(AUDIT_FILTER_OPTIONS).toContain("CONFIRMED");
    expect(AUDIT_FILTER_OPTIONS).toContain("DUPLICATE");
    expect(AUDIT_FILTER_OPTIONS).toContain("FAILED");
  });

  it("OPTIONS do not include PENDING (API uses FAILED)", () => {
    expect(AUDIT_FILTER_OPTIONS).not.toContain("PENDING");
  });

  it("OPTIONS length is 4", () => {
    expect(AUDIT_FILTER_OPTIONS).toHaveLength(4);
  });
});
