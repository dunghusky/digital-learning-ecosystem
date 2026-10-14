import { getRequestConfig } from "next-intl/server";

/**
 * Vietnamese is the only locale for now, but every user-facing string already goes through
 * next-intl so adding English later is a matter of shipping another message file.
 */
export const DEFAULT_LOCALE = "vi";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
