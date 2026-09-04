import type { AdminEventDbRow } from "./events";

type EventDataLoader = () => Promise<Response>;

type LoadAdminEventDataOptions = {
    loadOverview: EventDataLoader;
    loadEvents: EventDataLoader;
    formatError?: (error: unknown) => string;
};

type AdminEventDataResult = {
    events: AdminEventDbRow[];
    missingColumns: string[];
    warning: string | null;
    unauthorized: boolean;
};

type AdminEventOverviewResponse = {
    schema?: {
        missing_columns?: string[];
    };
    events?: AdminEventDbRow[];
};

function defaultFormatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** Load the combined overview and preserve saved stats if content sync fails. */
export async function loadAdminEventData(
    options: LoadAdminEventDataOptions,
): Promise<AdminEventDataResult> {
    const formatError = options.formatError ?? defaultFormatError;
    let overviewFailure: string;

    try {
        const overviewResponse = await options.loadOverview();
        if (overviewResponse.status === 401) {
            return {
                events: [],
                missingColumns: [],
                warning: null,
                unauthorized: true,
            };
        }
        if (overviewResponse.ok) {
            const overview = (
                await overviewResponse.json()
            ) as AdminEventOverviewResponse;
            return {
                events: Array.isArray(overview.events) ? overview.events : [],
                missingColumns: overview.schema?.missing_columns ?? [],
                warning: null,
                unauthorized: false,
            };
        }
        overviewFailure = (
            `Dashboard content sync unavailable `
            + `(API returned ${overviewResponse.status})`
        );
    } catch (error) {
        overviewFailure = (
            `Dashboard content sync unavailable: ${formatError(error)}`
        );
    }

    try {
        const eventsResponse = await options.loadEvents();
        if (eventsResponse.status === 401) {
            return {
                events: [],
                missingColumns: [],
                warning: null,
                unauthorized: true,
            };
        }
        if (eventsResponse.ok) {
            const events = await eventsResponse.json() as AdminEventDbRow[];
            return {
                events: Array.isArray(events) ? events : [],
                missingColumns: [],
                warning: `${overviewFailure}. Showing saved RSVP data.`,
                unauthorized: false,
            };
        }
        return {
            events: [],
            missingColumns: [],
            warning: (
                `${overviewFailure}; saved event data unavailable `
                + `(API returned ${eventsResponse.status})`
            ),
            unauthorized: false,
        };
    } catch (error) {
        return {
            events: [],
            missingColumns: [],
            warning: (
                `${overviewFailure}; saved event data unavailable: `
                + formatError(error)
            ),
            unauthorized: false,
        };
    }
}
