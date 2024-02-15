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
