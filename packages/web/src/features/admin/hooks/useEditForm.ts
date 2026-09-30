import { useEffect, useMemo, useState } from 'react';

// Form state for editing a loaded record: `changes` holds only the fields that differ
// from what was loaded, which is what the save mutations take. Resets when `initial`
// changes (after a save refetches it)
export const useEditForm = <T extends Record<string, unknown>>(initial: T) => {
  const [values, setValues] = useState(initial);
  const initialJson = JSON.stringify(initial);

  useEffect(() => {
    setValues(JSON.parse(initialJson));
  }, [initialJson]);

  const changes = useMemo(() => {
    const loaded = JSON.parse(initialJson) as T;
    return Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(loaded[key])
      )
    ) as Partial<T>;
  }, [values, initialJson]);

  return {
    values,
    set: <K extends keyof T>(key: K, value: T[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    changes,
    isDirty: Object.keys(changes).length > 0,
    reset: () => setValues(JSON.parse(initialJson)),
  };
};
