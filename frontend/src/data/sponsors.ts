export interface SponsorMain {
    id: string;
    name: string;
    parent: string;
    logoFull: string;
    logoParent: string;
    catKey: string;
    blurbKey: string;
    since: string;
}

export type LogoStyle = "brix" | "schuster" | "velothique" | "tegernsee";

export interface SponsorPartner {
    id: string;
    name: string;
    catKey: string;
    logoStyle: LogoStyle;
}

export const SPONSORS_MAIN: readonly SponsorMain[] = [
    {
        id: "ani",
        name: "Active Nutrition International",
        parent: "PowerBar · Dymatize · Premier Protein",
        logoFull: "/images/sponsors/sponsor-ani.png",
        logoParent: "/images/sponsors/sponsor-ani-parent.png",
        catKey: "partners.category.nutrition",
        blurbKey: "partners.blurb.ani",
        since: "2026",
    },
    {
        id: "ledu",
        name: "LeDU München",
        parent: "Chinese Street Food · München",
        logoFull: "/images/sponsors/sponsor-ledu-trim.png",
        logoParent: "/images/sponsors/sponsor-ledu-trim.png",
        catKey: "partners.category.hospitality",
        blurbKey: "partners.blurb.ledu",
        since: "2026",
    },
];

export const SPONSORS_PARTNERS: readonly SponsorPartner[] = [
    { id: "brix", name: "Brix Coffee", catKey: "partners.category.cafe", logoStyle: "brix" },
    { id: "schuster", name: "Sport Schuster", catKey: "partners.category.retail", logoStyle: "schuster" },
    { id: "velothique", name: "Velothique", catKey: "partners.category.service", logoStyle: "velothique" },
    { id: "tegernsee", name: "Tegernsee Bräu", catKey: "partners.category.afterride", logoStyle: "tegernsee" },
];
