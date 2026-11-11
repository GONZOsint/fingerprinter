import { hashObject } from '../../utils/hash.js';

/** Locale / Intl / timezone / Temporal capability surface. */
export async function collectIntl() {
  const resolved = Intl.DateTimeFormat().resolvedOptions();
  const tz = resolved.timeZone;
  const locale = resolved.locale;
  const number = (1234567.89).toLocaleString();
  const date = new Date(Date.UTC(2024, 0, 2, 12, 0, 0)).toLocaleString();
  const calendars = Intl.supportedValuesOf?.('calendar') || null;
  const numbering = Intl.supportedValuesOf?.('numberingSystem') || null;
  const collations = Intl.supportedValuesOf?.('collation') || null;
  const timeZones = Intl.supportedValuesOf?.('timeZone')?.length ?? null;

  let relative = null;
  try {
    relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-1, 'day');
  } catch {
    relative = null;
  }

  let localeInfo = null;
  try {
    if (typeof Intl.Locale === 'function') {
      const loc = new Intl.Locale(navigator.language || locale);
      localeInfo = {
        baseName: loc.baseName,
        language: loc.language,
        region: loc.region,
        script: loc.script,
        calendar: loc.calendar,
        numberingSystem: loc.numberingSystem,
        hourCycle: loc.hourCycle,
      };
    }
  } catch {
    localeInfo = null;
  }

  let displayNames = null;
  try {
    if (typeof Intl.DisplayNames === 'function') {
      const dn = new Intl.DisplayNames(undefined, { type: 'language' });
      displayNames = {
        language: dn.of(navigator.language || 'en'),
        region: new Intl.DisplayNames(undefined, { type: 'region' }).of(
          localeInfo?.region || 'US'
        ),
      };
    }
  } catch {
    displayNames = null;
  }

  const temporal = typeof Temporal !== 'undefined';

  const payload = {
    available: true,
    timezone: tz,
    locale,
    languages: [...(navigator.languages || [navigator.language])],
    language: navigator.language,
    numberFormatSample: number,
    dateFormatSample: date,
    relativeTimeSample: relative,
    calendarsCount: calendars?.length ?? null,
    numberingSystemsCount: numbering?.length ?? null,
    collationsCount: collations?.length ?? null,
    timeZonesCount: timeZones,
    timezoneOffset: new Date().getTimezoneOffset(),
    resolvedOptions: {
      calendar: resolved.calendar,
      numberingSystem: resolved.numberingSystem,
      hourCycle: resolved.hourCycle,
    },
    localeInfo,
    displayNames,
    temporal,
  };

  return {
    ...payload,
    fingerprint: await hashObject({
      timezone: tz,
      locale,
      languages: payload.languages,
      offset: payload.timezoneOffset,
      number,
      date,
      localeInfo,
      temporal,
    }),
  };
}
