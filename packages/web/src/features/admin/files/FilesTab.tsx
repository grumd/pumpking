import type { AdminFileSource } from '@/api/services/admin/files';
import { Button, Group, NumberInput, SegmentedControl, Stack } from '@mantine/core';
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useLanguage } from 'utils/context/translation';

import { AdminFiles } from '../components/AdminFiles/AdminFiles';

// Look up the files of a result or purgatory row by its id. The lookup is kept in the URL
// (`?source=results&id=123`), so it can be linked to
export const FilesTab = (): JSX.Element => {
  const lang = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const source: AdminFileSource =
    searchParams.get('source') === 'purgatory' ? 'purgatory' : 'results';
  const id = Number(searchParams.get('id')) || null;

  const [formSource, setFormSource] = useState<AdminFileSource>(source);
  const [formId, setFormId] = useState<string | number>(id ?? '');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (typeof formId === 'number') {
      setSearchParams({ source: formSource, id: String(formId) });
    }
  };

  return (
    <Stack gap="md">
      <form onSubmit={onSubmit}>
        <Group align="flex-end" gap="sm">
          <SegmentedControl
            value={formSource}
            onChange={(value) => setFormSource(value as AdminFileSource)}
            data={[
              { value: 'results', label: lang.ADMIN_RESULT },
              { value: 'purgatory', label: lang.ADMIN_PURGATORY },
            ]}
          />
          <NumberInput
            placeholder="id"
            value={formId}
            onChange={setFormId}
            allowNegative={false}
            allowDecimal={false}
            w="10em"
          />
          <Button type="submit" disabled={typeof formId !== 'number'}>
            {lang.ADMIN_OPEN}
          </Button>
        </Group>
      </form>
      {id && <AdminFiles source={source} id={id} />}
    </Stack>
  );
};
