import { atomWithStorage } from 'jotai/utils';
import { ZodType } from 'zod';

export const atomWithValidatedStorage = <Value>(
  _key: string,
  zodSchema: ZodType<Value>,
  value: Value
) =>
  atomWithStorage(
    _key,
    value,
    {
      getItem(key, initialValue) {
        const storedValue = localStorage.getItem(key);
        try {
          return zodSchema.parse(JSON.parse(storedValue ?? ''));
        } catch (error) {
          console.error('Error parsing stored data:', error);
          return initialValue;
        }
      },
      setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
      },
      removeItem(key) {
        localStorage.removeItem(key);
      },
      subscribe(key, callback, initialValue) {
        if (typeof window === 'undefined' || typeof window.addEventListener === 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return () => {};
        }
        const storageCallback = (e: StorageEvent) => {
          if (e.storageArea === localStorage && e.key === key) {
            let newValue;
            try {
              newValue = zodSchema.parse(JSON.parse(e.newValue ?? ''));
            } catch {
              newValue = initialValue;
            }
            callback(newValue);
          }
        };
        window.addEventListener('storage', storageCallback);
        return () => {
          window.removeEventListener('storage', storageCallback);
        };
      },
    },
    {
      // Maybe it will be stable one day :^)
      unstable_getOnInit: true,
    }
  );
