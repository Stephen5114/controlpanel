import { Eye, EyeOff } from "lucide-react";
import { ChangeEventHandler, useId, useState } from "react";

type AuthPasswordFieldProps = {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  name?: string;
};

export function AuthPasswordField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  name,
}: AuthPasswordFieldProps) {
  const inputId = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <label className="password-field__label" htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <div className="password-field__input-wrap">
        <input
          autoComplete={autoComplete}
          id={inputId}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          className="password-field__toggle"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}
