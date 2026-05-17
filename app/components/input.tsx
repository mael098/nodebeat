import type { ChangeEvent } from 'react';
import { TextField as MuiTextField } from '@mui/material';

type InputProps = {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  label,
  required,
  disabled,
  fullWidth = true,
}: InputProps) {
  return (
    <MuiTextField
      type={type}
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      name={name}
      label={label}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      variant="outlined"
    />
  );
}
