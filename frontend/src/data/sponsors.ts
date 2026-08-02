export type LogoStyle = "brix" | "schuster" | "velothique" | "tegernsee";

export interface SponsorMain {
    id: string;
    name: string;
    parent: string;
    logoFull: string;
    logoParent: string;
    catKey: string;
    blurbKey: string;
    since: string;
    videoId?: string;
}

export interface SponsorPartner {
    id: string;
    name: string;
    catKey: string;
    logoImg: string;
}

export const SPONSORS_MAIN: readonly SponsorMain[] = [
    {
        id: "ani",
        name: "Active Nutrition International",
        parent: "PowerBar · Dymatize · Premier Protein",
        logoFull: "/images/sponsors/Powerbar_Red_RGB.png",
        logoParent: "/images/sponsors/Powerbar_Red_RGB.png",
        catKey: "partners.category.energy",
        blurbKey: "partners.blurb.ani",
        since: "2026",
        videoId: "VHULMWU0W5M",
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
    {
        id: "grc",
        name: "GRC",
        parent: "GRC",
        logoFull: "/images/sponsors/grc_logo.png",
        logoParent: "/images/sponsors/grc_logo.png",
        catKey: "partners.category.apparel",
        blurbKey: "partners.blurb.grc",
        since: "2026",
    },
    {
        id: "magicshine",
        name: "Magicshine",
        parent: "Magicshine",
        logoFull: "/images/sponsors/magicshine_logo.png",
        logoParent: "/images/sponsors/magicshine_logo.png",
        catKey: "partners.category.lighting",
        blurbKey: "partners.blurb.magicshine",
        since: "2026",
    },
];

export const SPONSORS_PARTNERS: readonly SponsorPartner[] = [
    { id: "winspace", name: "Winspace Lun", catKey: "partners.category.wheelset", logoImg: "/images/sponsors/winspace_lun_logo.jpeg" },
    { id: "upvine",   name: "Upvine 静藤",  catKey: "partners.category.wheelset", logoImg: "/images/sponsors/upvine_logo.png" },
    { id: "superteam",name: "Superteam",    catKey: "partners.category.wheelset", logoImg: "/images/sponsors/superteam_logo.png" },
    { id: "sunrimoon", name: "Sunrimoon",   catKey: "partners.category.helmet",    logoImg: "/images/sponsors/sunrimoon_logo.png" },
];
