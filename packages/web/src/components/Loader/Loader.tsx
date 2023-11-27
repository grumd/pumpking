import { Loader as MantineLoader } from '@mantine/core';

import css from './loader.module.scss';

export default function Loader() {
  return (
    <div className={css.loader}>
      <MantineLoader color="white" type="dots" />
    </div>
  );
}
