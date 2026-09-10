import { describe, expect, it } from "vitest";
import {
  countActiveEligibilityGates,
  describeEligibilityMatrixValidation,
  formatEligibilityCallableError,
} from "$lib/director/eligibilityMatrixUi.js";
import { normalizeEligibilityMatrix } from "$lib/director/evaluateClubEligibility.js";

describe("eligibilityMatrixUi", () => {
  describe("countActiveEligibilityGates", () => {
    it("returns 0 for null or undefined input", () => {
      expect(countActiveEligibilityGates(null)).toBe(0);
      expect(countActiveEligibilityGates(undefined)).toBe(0);
    });

    it("returns 0 for an empty object", () => {
      expect(countActiveEligibilityGates({})).toBe(0);
    });

    it("returns 0 if no gates are active", () => {
      const allOff = normalizeEligibilityMatrix({
        requireWaiver: false,
        requirePassportVerified: false,
        requireVpcForMinors: false,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      expect(countActiveEligibilityGates(allOff)).toBe(0);
    });

    it("correctly counts active gates", () => {
      const partial = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: false,
        requireVpcForMinors: true,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      expect(countActiveEligibilityGates(partial)).toBe(2);

      const allOn = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: true,
        requireVpcForMinors: true,
        requireGuardianLinked: true,
        requireSafeSportClearance: true,
      });
      expect(countActiveEligibilityGates(allOn)).toBe(5);
    });

    it("ignores unknown properties in the matrix", () => {
      const partialWithExtra = {
        requireWaiver: true,
        requirePassportVerified: false,
        requireVpcForMinors: true,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
        someRandomProperty: true,
      };
      expect(countActiveEligibilityGates(partialWithExtra)).toBe(2);
    });
  });

  describe("describeEligibilityMatrixValidation", () => {
    it("returns warning state when matrix is null or undefined", () => {
      const resultNull = describeEligibilityMatrixValidation(null);
      expect(resultNull).toMatchObject({
        level: "warn",
        activeCount: 0,
        totalCount: 5, // DEFAULT_ELIGIBILITY_MATRIX keys length
        message: "No gates are enabled — every roster player will show as eligible.",
      });

      const resultUndefined = describeEligibilityMatrixValidation(undefined);
      expect(resultUndefined).toMatchObject({
        level: "warn",
        activeCount: 0,
        totalCount: 5,
      });
    });

    it("returns warning state when all gates are disabled", () => {
      const allOff = normalizeEligibilityMatrix({
        requireWaiver: false,
        requirePassportVerified: false,
        requireVpcForMinors: false,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      const result = describeEligibilityMatrixValidation(allOff);
      expect(result).toMatchObject({
        level: "warn",
        activeCount: 0,
        totalCount: 5,
        message: "No gates are enabled — every roster player will show as eligible.",
      });
    });

    it("returns ok state with correct count when some gates are enabled", () => {
      const partial = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: false,
        requireVpcForMinors: true,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      const result = describeEligibilityMatrixValidation(partial);
      expect(result).toMatchObject({
        level: "ok",
        activeCount: 2,
        totalCount: 5,
        message: "2 of 5 gates active.",
      });
    });

    it("returns ok state with correct count when all gates are enabled", () => {
      const allOn = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: true,
        requireVpcForMinors: true,
        requireGuardianLinked: true,
        requireSafeSportClearance: true,
      });
      const result = describeEligibilityMatrixValidation(allOn);
      expect(result).toMatchObject({
        level: "ok",
        activeCount: 5,
        totalCount: 5,
        message: "5 of 5 gates active.",
      });
    });
  });
});
