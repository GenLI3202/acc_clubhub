import { middleware as i18nMiddleware } from "astro:i18n";
import { defineMiddleware } from "astro:middleware";

const runI18n = i18nMiddleware({
    prefixDefaultLocale: true,
    redirectToDefaultLocale: false,
    fallbackType: "redirect",
});

export const onRequest = defineMiddleware((context, next) => {
    const path = context.url.pathname;

    if (path === "/dashboard/") {
        return context.redirect("/dashboard", 308);
    }

    if (path.startsWith("/dashboard")) {
        return next();
    }

    return runI18n(context, next);
});
