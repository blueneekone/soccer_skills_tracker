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
});
