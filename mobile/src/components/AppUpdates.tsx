import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "preact/hooks";

import type { MobileLocale } from "../../../shared/mobile_content";
import { APP_CONFIG, APP_VERSION } from "../config";
import { translate } from "../i18n";
import {
    apply_live_update,
    check_for_live_update,
    get_native_version,
    subscribe_live_updates,
    type LiveUpdateCheckStatus,
} from "../services/live_update";

export function AppUpdates({ locale }: { locale: MobileLocale }) {
    const is_ios = Capacitor.getPlatform() === "ios";
    const supports_live_updates =
        APP_CONFIG.live_update.enabled && Capacitor.getPlatform() === "android";
    const [status, set_status] = useState<LiveUpdateCheckStatus>("skipped");
    const [checking, set_checking] = useState(false);
    const [confirming, set_confirming] = useState(false);
    const [native_version, set_native_version] = useState<string>();
    const [apply_failed, set_apply_failed] = useState(false);

    useEffect(() => {
        let active = true;
        void get_native_version()
            .then((version) => {
                if (active) set_native_version(version);
            })
            .catch(() => {
                /* Version details are optional when the bridge is unavailable. */
            });
        const unsubscribe = subscribe_live_updates((result) =>
            set_status(result.status),
        );
        return (): void => {
            active = false;
            unsubscribe();
        };
    }, []);

    const check = async (): Promise<void> => {
        set_checking(true);
        set_apply_failed(false);
        try {
            const result = await check_for_live_update();
            set_status(result.status);
        } finally {
            set_checking(false);
        }
    };
    const apply = async (): Promise<void> => {
        set_checking(true);
        try {
            await apply_live_update();
        } catch {
            set_apply_failed(true);
            set_checking(false);
        }
    };
    const ready =
        supports_live_updates && (status === "downloaded" || status === "pending");

    return (
        <section class="form-card" aria-label={translate(locale, "app_updates")}>
            <h2>{translate(locale, "app_updates")}</h2>
            <p>{translate(locale, "app_web_version", { version: APP_VERSION })}</p>
            {native_version ? (
                <p>
                    {translate(locale, "app_native_version", {
                        version: native_version,
                    })}
                </p>
            ) : null}
            <p aria-live="polite">
                {translate(
                    locale,
                    is_ios
                        ? "update_ios"
                        : ready
                          ? "update_ready"
                          : status === "current"
                            ? "update_current"
                            : status === "unavailable"
                              ? "update_unavailable"
                              : "update_intro",
                )}
            </p>
            {supports_live_updates ? (
                <button
                    class="secondary-button"
                    disabled={checking}
                    onClick={check}
                    type="button"
                >
                    {translate(locale, checking ? "update_checking" : "update_check")}
                </button>
            ) : !is_ios ? (
                <p>{translate(locale, "update_disabled")}</p>
            ) : null}
            {ready ? (
                <>
                    {confirming ? (
                        <p>{translate(locale, "update_restart_warning")}</p>
                    ) : null}
                    <button
                        class="primary-button"
                        disabled={checking}
                        onClick={() =>
                            confirming ? void apply() : set_confirming(true)
                        }
                        type="button"
                    >
                        {translate(
                            locale,
                            confirming ? "update_restart_confirm" : "update_apply",
                        )}
                    </button>
                </>
            ) : null}
            {apply_failed ? (
                <p role="alert">{translate(locale, "update_unavailable")}</p>
            ) : null}
        </section>
    );
}
