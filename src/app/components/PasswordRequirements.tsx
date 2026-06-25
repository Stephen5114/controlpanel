import { Check, Circle } from "lucide-react";
import { evaluatePassword, MIN_PASSWORD_LENGTH } from "../lib/password-rules";
import { useLocalization } from "../lib/i18n";

type PasswordRequirementsProps = {
  password: string;
};

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { t } = useLocalization();

  if (password.length === 0) {
    return null;
  }

  const rules = evaluatePassword(password);

  return (
    <ul aria-label={t("Password requirements", "Password requirements")} className="password-requirements">
      {rules.map((rule) => {
        let translated = t(rule.labelKey, rule.labelKey);
        if (rule.labelKey.includes("{min}")) {
          translated = translated.replace("{min}", String(MIN_PASSWORD_LENGTH));
        }
        return (
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
            <span>{translated}</span>
          </li>
        );
      })}
    </ul>
  );
}
