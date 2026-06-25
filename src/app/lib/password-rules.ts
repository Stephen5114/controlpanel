// Mirrors the backend password policy in
// IIS-Site-Manager/backend/Services/HostingPlatformService.cs (ValidateCustomerPasswordStrength).
// Keep these rules in sync with the server, which remains the authoritative validator.

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordRule = {
  id: string;
  label: string;
  passed: boolean;
};

export function evaluatePassword(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "lower",
      label: "A lowercase letter",
      passed: /\p{Ll}/u.test(password),
    },
    {
      id: "upper",
      label: "An uppercase letter",
      passed: /\p{Lu}/u.test(password),
    },
    {
      id: "digit",
      label: "A number",
      passed: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "A symbol (e.g. !@#$%)",
      passed: /[^\p{L}\p{N}]/u.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return evaluatePassword(password).every((rule) => rule.passed);
}
