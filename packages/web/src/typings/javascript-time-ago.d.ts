declare module 'javascript-time-ago' {
  import type { Gradation, Unit } from 'javascript-time-ago/gradation';
  import type { Flavour } from 'javascript-time-ago/style';
  import type {
    DefaultFormats,
    Duration,
    Formats,
    Locale,
    RTFFormatter,
    TimeUnit,
  } from 'javascript-time-ago/locale';

  interface FixedFormatStyle {
    flavour?: Flavour | undefined;
    gradation?: readonly Gradation[] | undefined;
    units?: readonly Unit[] | undefined;
  }
  export default class TimeAgo {
    constructor(locales?: string | string[]);

    format(input: Date | number, style?: string | FixedFormatStyle): string;
    formatNumber(number: number): string;
    formatValue(value: Date | number, unit: TimeUnit, localeData: Duration): string;
    getFormatter(flavor: DefaultFormats): RTFFormatter;
    getLocaleData(format?: Formats): Duration; // Defaults to "long"
    getRule(value: Date | number, unit: TimeUnit, localeData: Duration): string;

    static addLocale(localeData: Locale): void;
    static addDefaultLocale(localeData: Locale): void;
    static locale(localeData: Locale): void;
    static getDefaultLocale(): string;
    static intlDateTimeFormatSupported(): boolean;
    static intlDateTimeFormatSupportedLocale(locale: string): string | void;
    static setDefaultLocale(locale: string): void;
  }
}

declare module 'javascript-time-ago/modules/gradation/convenient' {
  import type { Gradation } from 'javascript-time-ago/gradation';

  const convenient: readonly Gradation[];
  export default convenient;
}

declare module 'javascript-time-ago/locale' {
  export interface Locale {
    locale: string;
    long?: Duration | undefined;
    short?: Duration | undefined;
    narrow?: Duration | undefined;
    tiny?: Duration | undefined;
    'short-time'?: Duration | undefined;
    'short-convenient'?: Duration | undefined;
    'long-time'?: Duration | undefined;
    'long-convenient'?: Duration | undefined;
    quantify: (n: number) => keyof QuantifyType;
  }

  export interface Duration {
    flavour?: Formats | undefined;
    year: Tense;
    quarter: Tense;
    month: Tense;
    week: Tense;
    day: Tense;
    hour: Tense;
    minute: Tense;
    second: Tense;
  }

  export type Tense =
    | QuantifyType
    | string
    | {
        previous?: QuantifyType | string | undefined;
        current?: QuantifyType | string | undefined;
        next?: QuantifyType | string | undefined;
        past?: QuantifyType | string | undefined;
        future?: QuantifyType | string | undefined;
      };

  export interface QuantifyType {
    one: string;
    two?: string | undefined;
    few?: string | undefined;
    other: string;
  }

  export interface RTFFormatter {
    numeric: string;
    style: DefaultFormats;
    localeMatcher: string;
    locale: string;
    numberFormat: { [key: string]: any };
  }

  export type TimeUnit =
    | 'now'
    | 'second'
    | 'minute'
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'quarter'
    | 'year';
  export type DefaultFormats = 'long' | 'short' | 'narrow';
  export type ExtendedFormats =
    | 'tiny'
    | 'short-time'
    | 'short-convenient'
    | 'long-time'
    | 'long-convenient';
  export type Formats = DefaultFormats | ExtendedFormats;
}
