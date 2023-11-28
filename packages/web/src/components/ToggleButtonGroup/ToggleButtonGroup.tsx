import { ToggleButton } from 'components/ToggleButton/ToggleButton';

interface ToggleButtonGroupProps<V extends string> {
  options: Array<{
    label: string;
    value: V;
  }>;
  onChange: (selected: V[]) => void;
  selected: V[];
}

export const ToggleButtonGroup = <V extends string>({
  options,
  onChange,
  selected,
}: ToggleButtonGroupProps<V>): JSX.Element => {
  const onToggle = (value: V) => {
    if (selected.includes(value)) {
      const newSelected = selected.filter((v) => v !== value);
      if (newSelected.length === 0) {
        onChange(options.map((opt) => opt.value));
      } else {
        onChange(selected.filter((v) => v !== value));
      }
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <>
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          pressed={selected.includes(option.value)}
          onToggle={() => onToggle(option.value)}
        >
          {option.label}
        </ToggleButton>
      ))}
    </>
  );
};
