import { Paper, type PaperProps } from '@mantine/core';

import css from './card.module.css';

export interface CardProps extends PaperProps {
  children: React.ReactNode;
  // 1: a section on the page. 2: a card or row inside a level-1 card
  level?: 1 | 2;
  title?: React.ReactNode;
  // Icon buttons or a small control, right of the title
  actions?: React.ReactNode;
  component?: 'li' | 'div' | 'section';
}

export const Card = ({ children, actions, level = 1, title, ...rest }: CardProps): JSX.Element => {
  return (
    <Paper
      p={level === 1 ? 'sm' : 'xs'}
      bg={level === 1 ? 'var(--pk-surface-1)' : 'var(--pk-surface-2)'}
      {...rest}
    >
      {(title || actions) && (
        <header className={css.header}>
          {title && <h2 className={css.title}>{title}</h2>}
          {actions && <div className={css.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </Paper>
  );
};
