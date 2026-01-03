import { Alert, Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';
import type { ComboboxItem } from '@mantine/core';
import { useForm } from '@mantine/form';

import './registration-form.scss';

import { Flag } from 'components/Flag/Flag';

import { useRegister } from 'hooks/useRegister';

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
          return 'Please select a valid country';
        }
        return null;
      },
      nickname: (value) => {
        if (!value.trim()) return 'Nickname is required';
        if (value.trim().length < 2) return 'Nickname must be at least 2 characters';
        if (value.trim().length > 32) return 'Nickname must be at most 32 characters';
        return null;
      },
      arcadeName: (value) => {
        if (value.trim().length > 64) return 'Arcade name must be at most 64 characters';
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
        Create your account
      </Text>
      <Text size="sm" c="dimmed" mb="lg">
        Email: {email}
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nickname"
            placeholder="Your display name"
            {...form.getInputProps('nickname')}
          />

          <Select
            label="Region"
            placeholder="Select your country"
            data={COUNTRY_OPTIONS}
            clearable
            renderOption={renderCountryOption}
            {...form.getInputProps('region')}
          />

          <TextInput
            label="Arcade Name (optional)"
            placeholder="Your in-game name on AMPASS"
            {...form.getInputProps('arcadeName')}
          />

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <Button type="submit" loading={isLoading} fullWidth>
            Register
          </Button>
        </Stack>
      </form>
    </div>
  );
}
