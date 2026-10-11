import css from './key-value-list.module.css';

type Item = { label: React.ReactNode; value: React.ReactNode };

interface KeyValueListProps {
  // Falsy items are skipped, so items can be conditional
  items: Array<Item | false | null | undefined>;
}

// Dimmed labels on the left, values on the right
export const KeyValueList = ({ items }: KeyValueListProps): JSX.Element => {
  return (
    <dl className={css.list}>
      {items.filter(Boolean).map((item, index) => {
        const { label, value } = item as Item;
        return (
          <div key={index} className={css.item}>
            <dt className={css.label}>{label}</dt>
            <dd className={css.value}>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
};
