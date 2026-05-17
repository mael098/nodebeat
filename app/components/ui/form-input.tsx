import { ReactNode } from 'react';

type FormInputProps = {
  id: string;
  name: string;
  type?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: ReactNode;
  required?: boolean;
  autoComplete?: string;
};

export default function FormInput({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  icon,
  required,
  autoComplete,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          style={{ paddingLeft: icon ? '2.5rem' : '1rem' }}
        />
      </div>
    </div>
  );
}
