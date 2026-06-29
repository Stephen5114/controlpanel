// Mirrors the backend password policy in
// IIS-Site-Manager/backend/Services/HostingPlatformService.cs (ValidateCustomerPasswordStrength).
// Keep these rules in sync with the server, which remains the authoritative validator.

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordRule = {
  id: string;
  labelKey: string;
  passed: boolean;
};

export function evaluatePassword(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      labelKey: "At least {min} characters",
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "lower",
      labelKey: "A lowercase letter",
      passed: /\p{Ll}/u.test(password),
    },
    {
      id: "upper",
      labelKey: "An uppercase letter",
      passed: /\p{Lu}/u.test(password),
    },
    {
      id: "digit",
      labelKey: "A number",
      passed: /\d/.test(password),
    },
    {
      id: "symbol",
      labelKey: "A symbol (e.g. !@#$%)",
      passed: /[^\p{L}\p{N}]/u.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return evaluatePassword(password).every((rule) => rule.passed);
}
