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

    it("handles matrix values that are falsely true (like strings or numbers) safely", () => {
      // The function implementation currently uses a truthy check (matrix[key] ? 1 : 0)
      const matrixWithTruthyValues = {
        requireWaiver: true,
        requirePassportVerified: "yes",
        requireVpcForMinors: 1,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      };
      // @ts-expect-error Intentionally passing wrong types to test robustness
      expect(countActiveEligibilityGates(matrixWithTruthyValues)).toBe(3);
    });
  });

  describe("describeEligibilityMatrixValidation", () => {
    it("returns warning state when zero gates are active", () => {
      const allOff = normalizeEligibilityMatrix({
        requireWaiver: false,
        requirePassportVerified: false,
        requireVpcForMinors: false,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      const result = describeEligibilityMatrixValidation(allOff);
      expect(result).toEqual({
        level: "warn",
        activeCount: 0,
        totalCount: 5,
        message: "No gates are enabled — every roster player will show as eligible.",
      });
    });

    it("returns ok state when some gates are active", () => {
      const partial = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: false,
        requireVpcForMinors: true,
        requireGuardianLinked: false,
        requireSafeSportClearance: false,
      });
      const result = describeEligibilityMatrixValidation(partial);
      expect(result).toEqual({
        level: "ok",
        activeCount: 2,
        totalCount: 5,
        message: "2 of 5 gates active.",
      });
    });

    it("returns ok state when all gates are active", () => {
      const allOn = normalizeEligibilityMatrix({
        requireWaiver: true,
        requirePassportVerified: true,
        requireVpcForMinors: true,
        requireGuardianLinked: true,
        requireSafeSportClearance: true,
      });
      const result = describeEligibilityMatrixValidation(allOn);
      expect(result).toEqual({
        level: "ok",
        activeCount: 5,
        totalCount: 5,
        message: "5 of 5 gates active.",
      });
    });
  });

  describe("formatEligibilityCallableError", () => {
    it("returns fallback for non-object errors", () => {
      expect(formatEligibilityCallableError(null, "fallback")).toBe("fallback");
      expect(formatEligibilityCallableError(undefined, "fallback")).toBe("fallback");
      expect(formatEligibilityCallableError("error string", "fallback")).toBe("fallback");
      expect(formatEligibilityCallableError(123, "fallback")).toBe("fallback");
    });

    it("returns fallback for error object without code and message", () => {
      expect(formatEligibilityCallableError({}, "fallback")).toBe("fallback");
      expect(formatEligibilityCallableError({ someProp: "value" }, "fallback")).toBe("fallback");
    });

    it("returns message for permission-denied code (with or without functions/ prefix)", () => {
      expect(
        formatEligibilityCallableError(
          { code: "functions/permission-denied", message: "Denied!" },
          "fallback",
        ),
      ).toBe("Denied!");
      expect(
        formatEligibilityCallableError(
          { code: "permission-denied", message: "Denied again!" },
          "fallback",
        ),
      ).toBe("Denied again!");
    });

    it("returns message for not-found code (with or without functions/ prefix)", () => {
      expect(
        formatEligibilityCallableError(
          { code: "functions/not-found", message: "Not found!" },
          "fallback",
        ),
      ).toBe("Not found!");
      expect(
        formatEligibilityCallableError(
          { code: "not-found", message: "Not found again!" },
          "fallback",
        ),
      ).toBe("Not found again!");
    });

    it("returns message for invalid-argument code (with or without functions/ prefix)", () => {
      expect(
        formatEligibilityCallableError(
          { code: "functions/invalid-argument", message: "Invalid!" },
          "fallback",
        ),
      ).toBe("Invalid!");
      expect(
        formatEligibilityCallableError(
          { code: "invalid-argument", message: "Invalid again!" },
          "fallback",
        ),
      ).toBe("Invalid again!");
    });

    it("returns fallback if code is known but message is missing/empty", () => {
      expect(
        formatEligibilityCallableError({ code: "functions/permission-denied" }, "fallback"),
      ).toBe("fallback");
      expect(
        formatEligibilityCallableError({ code: "permission-denied", message: "  " }, "fallback"),
      ).toBe("fallback");
    });

    it("returns message for unknown code if message exists", () => {
      expect(
        formatEligibilityCallableError(
          { code: "functions/unknown-error", message: "Something went wrong" },
          "fallback",
        ),
      ).toBe("Something went wrong");
      expect(
        formatEligibilityCallableError(
          { message: "Just a message" },
          "fallback",
        ),
      ).toBe("Just a message");
    });
  });
});
