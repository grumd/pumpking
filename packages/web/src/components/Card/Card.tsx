import { Paper, type PaperProps } from '@mantine/core';

import css from './card.module.css';

export interface CardProps extends PaperProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  title?: React.ReactNode;
  headerNode?: React.ReactNode;
  component?: 'li' | 'div';
}

export const Card = ({
  children,
  headerNode,
  level = 1,
  title,
  ...rest
}: CardProps): JSX.Element => {
  return (
    <Paper
      shadow="sm"
      radius="md"
      p="sm"
      bg={['dark.6', 'dark.5', 'dark.4', 'dark.3'][level - 1]}
      {...rest}
    >
      {(title || headerNode) && (
        <header className={css.header}>
          {title && <span className={css.text}>{title}</span>}
          {headerNode && <div>{headerNode}</div>}
        </header>
      )}
      {children}
    </Paper>
  );
};
