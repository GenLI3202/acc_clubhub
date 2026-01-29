import { defineCollection, z } from 'astro:content';

const routesCollection = defineCollection({
    type: 'content',
    schema: z.object({
        name: z.string(),
        description: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
        distance: z.number(),
        elevation: z.number(),
        cover: z.string().optional(),
        region: z.string().optional(),
    }),
});

const mediaCollection = defineCollection({
    type: 'content', // or 'data'? Usually content for markdown
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        cover: z.string().optional(),
        date: z.date(),
        type: z.enum(['video', 'article', 'interview']),
        author: z.string().optional(),
    }),
});

const eventsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        date: z.date(),
        eventType: z.string(), // e.g., 'Social Ride', 'Training'
        cover: z.string().optional(),
        location: z.string().optional(),
        registrationLink: z.string().optional(),
    }),
});

// Reusable schema for knowledge base content (Gear, Training)
const knowledgeSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    date: z.date(),
    category: z.string().optional(), // Dynamic filter
    subcategory: z.string().optional(), // Dynamic filter
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(), // Dynamic filter
    xiaohongshuUrl: z.string().optional(),
});

const gearCollection = defineCollection({
    type: 'content',
    schema: knowledgeSchema
});

const trainingCollection = defineCollection({
    type: 'content',
    schema: knowledgeSchema
});

export const collections = {
    routes: routesCollection,
    media: mediaCollection,
    events: eventsCollection,
    gear: gearCollection,
    training: trainingCollection,
};
