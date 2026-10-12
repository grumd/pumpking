import { Alert } from '@mantine/core';
import { FaExclamationCircle } from 'react-icons/fa';

import { useLanguage } from 'utils/context/translation';

// A red alert titled "Error": a query or a page that failed
export const ErrorAlert = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const lang = useLanguage();
  return (
    <Alert color="red" title={lang.ERROR} icon={<FaExclamationCircle />}>
      {children}
    </Alert>
  );
};
