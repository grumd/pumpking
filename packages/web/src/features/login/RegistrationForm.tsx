import { Alert, Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import type { ComboboxItem } from '@mantine/core';
import { useForm } from '@mantine/form';

import './registration-form.scss';

import { Flag } from 'components/Flag/Flag';

import { useRegister } from 'hooks/useRegister';

import { useLanguage } from 'utils/context/translation';

interface RegistrationFormProps {
  email: string;
  registrationToken: string;
}

interface FormValues {
  nickname: string;
  region: string | null;
  arcadeName: string;
}

const COUNTRY_OPTIONS = [
  { value: 'BR', label: 'Brazil' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'MX', label: 'Mexico' },
  { value: 'PL', label: 'Poland' },
  { value: 'RU', label: 'Russia' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'US', label: 'United States' },
];

const renderCountryOption = ({ option }: { option: ComboboxItem }) => (
  <Group gap="xs">
    <Flag region={option.value} />
    <span>{option.label}</span>
  </Group>
);

export function RegistrationForm({ email, registrationToken }: RegistrationFormProps) {
  const lang = useLanguage();
  const { register, isLoading, error } = useRegister();

  const form = useForm<FormValues>({
    initialValues: {
      nickname: '',
      region: null,
      arcadeName: '',
    },
    validate: {
      region: (value) => {
        if (!COUNTRY_OPTIONS.some((option) => option.value === value)) {
          return lang.VALIDATION_SELECT_COUNTRY;
        }
        return null;
      },
      nickname: (value) => {
        if (!value.trim()) return lang.VALIDATION_NICKNAME_REQUIRED;
        if (value.trim().length < 2) return lang.VALIDATION_NICKNAME_MIN;
        if (value.trim().length > 32) return lang.VALIDATION_NICKNAME_MAX;
        return null;
      },
      arcadeName: (value) => {
        if (value.trim().length > 64) return lang.VALIDATION_ARCADE_NAME_MAX;
        return null;
      },
    },
  });

  const onSubmit = (data: FormValues) => {
    register({
      registrationToken,
      nickname: data.nickname.trim(),
      region: data.region || null,
      arcadeName: data.arcadeName.trim() || null,
    });
  };

  return (
    <div className="registration-form">
      <h1 className="site-name">pumpking</h1>
      <Text size="lg" fw={500} mb="md">
        {lang.CREATE_YOUR_ACCOUNT}
      </Text>
      <Text size="sm" c="dimmed" mb="lg">
        {lang.EMAIL_LABEL} {email}
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label={lang.NICKNAME}
            placeholder={lang.NICKNAME_PLACEHOLDER}
            {...form.getInputProps('nickname')}
          />

          <Select
            label={lang.REGION}
            placeholder={lang.REGION_SELECT_PLACEHOLDER}
            data={COUNTRY_OPTIONS}
            clearable
            renderOption={renderCountryOption}
            {...form.getInputProps('region')}
          />

          <TextInput
            label={lang.ARCADE_NAME_LABEL}
            placeholder={lang.ARCADE_NAME_PLACEHOLDER}
            {...form.getInputProps('arcadeName')}
          />

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <Button type="submit" loading={isLoading} fullWidth>
            {lang.REGISTER}
          </Button>
        </Stack>
      </form>
    </div>
  );
}
