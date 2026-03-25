import * as Localization from 'expo-localization';

export const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en-GB';

export const formatDate = (
    date: string | Date,
    options: Intl.DateTimeFormatOptions
): string => {
    return new Date(date).toLocaleDateString(deviceLocale, options);
};