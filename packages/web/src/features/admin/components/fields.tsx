import { NumberInput, Select, TextInput } from '@mantine/core';

interface FieldProps<T> {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  highlighted?: boolean;
  disabled?: boolean;
  description?: React.ReactNode;
}

const highlightProps = (highlighted?: boolean) =>
  highlighted ? { error: true as const, labelProps: { c: 'red.4' } } : {};

export const NumberField = ({
  label,
  value,
  onChange,
  highlighted,
  disabled,
  description,
  isId,
}: FieldProps<number> & { isId?: boolean }): JSX.Element => (
  <NumberInput
    label={label}
    value={value ?? ''}
    onChange={(next) => onChange(typeof next === 'number' ? next : null)}
    allowNegative={false}
    allowDecimal={false}
    thousandSeparator={isId ? undefined : ','}
    disabled={disabled}
    description={description}
    {...highlightProps(highlighted)}
  />
);

export const TextField = ({
  label,
  value,
  onChange,
  highlighted,
  disabled,
  description,
  placeholder,
}: FieldProps<string> & { placeholder?: string }): JSX.Element => (
  <TextInput
    label={label}
    value={value ?? ''}
    onChange={(event) => onChange(event.currentTarget.value || null)}
    disabled={disabled}
    description={description}
    placeholder={placeholder}
    {...highlightProps(highlighted)}
  />
);

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  highlighted,
  disabled,
  description,
  clearable = true,
}: FieldProps<string> & {
  options: { value: string; label: string }[];
  clearable?: boolean;
}): JSX.Element => {
  const data =
    value != null && !options.some((option) => option.value === value)
      ? [{ value, label: value }, ...options]
      : options;
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      data={data}
      clearable={clearable}
      disabled={disabled}
      description={description}
      {...highlightProps(highlighted)}
    />
  );
};
