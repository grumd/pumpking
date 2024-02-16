declare module 'relative-time-format/locale/uk' {
  import { Duration, QuantifyType } from 'javascript-time-ago/locale';

  declare const locale: Locale;

  interface Locale {
    locale: 'uk';
    long: Duration;
    narrow: Duration;
    short: Duration;
    tiny: Duration;
    quantify: (n: number) => keyof QuantifyType;
  }

  export default locale;
}
