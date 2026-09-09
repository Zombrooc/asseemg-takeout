/**
 * Invariants: AuditFilters options must match API GET /audit status values.
 * API status: CONFIRMED | DUPLICATE | FAILED | REVERSED. ALL for no filter.
 */
var AUDIT_FILTER_OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED", "REVERSED"];
describe("AuditFilters invariants", function () {
    it("OPTIONS include ALL and API status values CONFIRMED, DUPLICATE, FAILED, REVERSED", function () {
        expect(AUDIT_FILTER_OPTIONS).toContain("ALL");
        expect(AUDIT_FILTER_OPTIONS).toContain("CONFIRMED");
        expect(AUDIT_FILTER_OPTIONS).toContain("DUPLICATE");
        expect(AUDIT_FILTER_OPTIONS).toContain("FAILED");
        expect(AUDIT_FILTER_OPTIONS).toContain("REVERSED");
    });
    it("OPTIONS do not include PENDING (API uses FAILED)", function () {
        expect(AUDIT_FILTER_OPTIONS).not.toContain("PENDING");
    });
    it("OPTIONS length is 5", function () {
        expect(AUDIT_FILTER_OPTIONS).toHaveLength(5);
    });
});
