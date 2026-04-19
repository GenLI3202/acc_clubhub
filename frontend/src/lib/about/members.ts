// Virtual Garage roster — real members + placeholders for the stamp-wall marquee
// and the Featured Riders accordion. Bios/roles/tenure shown in English for MVP;
// translate when localized bios are authored.

import type { Locale } from '../i18n';

export interface Member {
    id: string;
    name: string;
    bike: string;
    /** public path to bike cutout PNG (served from /public) */
    photo: string;
    joined: number;
    tenure: string;
    bio: string;
    /** e.g. "A+ · racing", "Captain · A group" */
    role: string;
    captain?: boolean;
}

/** Real members + 8 placeholder riders so the marquee has density */
export const MEMBERS: readonly Member[] = [
    {
        id: 'root',
        name: 'Root Li',
        bike: 'Lapierre',
        photo: '/images/about/bikes/lp.png',
        joined: 2022,
        tenure: '4 years',
        bio: 'Road racer chasing KOMs on weekend climbs.',
        role: 'A+ · racing',
    },
    {
        id: 'shane',
        name: 'Shane Shen',
        bike: 'Canyon',
        photo: '/images/about/bikes/canyon-purple.jpg',
        joined: 2021,
        tenure: '5 years',
        bio: 'Coffee stop connoisseur and Sunday social rider.',
        role: 'B · social',
    },
    {
        id: 'victor',
        name: 'Victor Yuan',
        bike: 'Bianchi',
        photo: '/images/about/bikes/bianchi.png',
        joined: 2023,
        tenure: '3 years',
        bio: 'Gravel explorer, always looking for the unpaved route.',
        role: 'Gravel lead',
    },
    {
        id: 'sky',
        name: 'Sky Zhang',
        bike: 'Colnago',
        photo: '/images/about/bikes/colnago.png',
        joined: 2020,
        tenure: '6 years',
        bio: 'Club captain, been riding these roads for 5 years.',
        role: 'Captain · A group',
        captain: true,
    },
    {
        id: 'mina',
        name: 'Mina Chen',
        bike: 'Specialized',
        photo: '/images/about/bikes/canyon-purple.jpg',
        joined: 2024,
        tenure: '2 years',
        bio: 'Mountain passes on weekdays, espresso on weekends.',
        role: 'A · climbing',
    },
    {
        id: 'jun',
        name: 'Jun Wang',
        bike: 'Trek',
        photo: '/images/about/bikes/lp.png',
        joined: 2024,
        tenure: '1 year',
        bio: 'New to Munich, fast on flats, patient on hills.',
        role: 'B · endurance',
    },
    {
        id: 'lena',
        name: 'Lena Zhou',
        bike: 'Pinarello',
        photo: '/images/about/bikes/colnago.png',
        joined: 2023,
        tenure: '3 years',
        bio: 'Long rides through Isar valleys, always with a camera.',
        role: 'A · endurance',
    },
    {
        id: 'kai',
        name: 'Kai Liu',
        bike: 'Cervelo',
        photo: '/images/about/bikes/bianchi.png',
        joined: 2022,
        tenure: '4 years',
        bio: 'Gravel convert. Will ride anything with knobbies.',
        role: 'Gravel',
    },
    {
        id: 'yuna',
        name: 'Yuna Park',
        bike: 'Giant',
        photo: '/images/about/bikes/canyon-purple.jpg',
        joined: 2025,
        tenure: '1 year',
        bio: 'Commuter turned climber. Addicted to Großglockner dreams.',
        role: 'B · climbing',
    },
    {
        id: 'ren',
        name: 'Ren Tanaka',
        bike: 'Ridley',
        photo: '/images/about/bikes/lp.png',
        joined: 2021,
        tenure: '5 years',
        bio: "Criterium specialist, sprints like it's a track day.",
        role: 'A+ · racing',
    },
    {
        id: 'mei',
        name: 'Mei Yoshida',
        bike: 'Factor',
        photo: '/images/about/bikes/colnago.png',
        joined: 2023,
        tenure: '3 years',
        bio: 'Data-obsessed rider; chasing FTP every Tuesday night.',
        role: 'A · racing',
    },
    {
        id: 'theo',
        name: 'Theo Schmidt',
        bike: 'BMC',
        photo: '/images/about/bikes/bianchi.png',
        joined: 2020,
        tenure: '6 years',
        bio: 'Local guide. Knows every Bavarian backroad by heart.',
        role: 'Ride leader',
    },
] as const;

/**
 * `joined N` phrasing per locale — kept separate from Member data so bios can
 * remain English while the surrounding metadata localizes.
 */
export function formatJoined(lang: Locale, year: number): string {
    if (lang === 'zh') return `${year} 年加入`;
    if (lang === 'de') return `seit ${year}`;
    return `joined ${year}`;
}
