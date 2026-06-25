import { Check, Circle } from "lucide-react";
import { evaluatePassword } from "../lib/password-rules";

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (password.length === 0) {
    return null;
  }

  const rules = evaluatePassword(password);

  return (
    <ul aria-label="Password requirements" className="password-requirements">
      {rules.map((rule) => (
        <li
          className={`password-requirements__item ${
            rule.passed ? "password-requirements__item--met" : "password-requirements__item--unmet"
          }`}
          key={rule.id}
        >
          {rule.passed ? (
            <Check aria-hidden="true" size={15} />
          ) : (
            <Circle aria-hidden="true" size={15} />
          )}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}
