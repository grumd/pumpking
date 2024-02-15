import { Loader as MantineLoader } from '@mantine/core';
import cx from 'classnames';

import css from './loader.module.scss';

export default function Loader({ className }: { className?: string }) {
  return (
    <div className={cx(css.loader, className)}>
      <MantineLoader color="white" type="dots" />
    </div>
  );
}
