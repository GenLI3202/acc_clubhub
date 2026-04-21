---
# REQUIRED FIELDS
slug: my-media-post          # URL path: /[lang]/media/[slug] — kebab-case
title: Post Title
date: 2026-06-01             # ISO date YYYY-MM-DD

# TYPE — controls which tab/filter this post appears under
# video | interview | adventure | gallery
type: gallery

# OPTIONAL FIELDS
description: Short one-sentence summary shown in cards and meta tags.
author: ACC Club              # defaults to 'ACC Club' if omitted

# ASSETS — place files under public/images/media/{type}/{slug}/ before referencing here
# type maps to the type field above: group-ride | adventure | video | interview
# cover image:  public/images/media/{type}/{slug}/cover.jpg
# gallery:      public/images/media/{type}/{slug}/gallery/01-descriptor.jpg
cover: /images/media/{type}/{slug}/cover.jpg

tags: [race, alps]            # free-form tags for search/filter
videoUrl: https://...         # YouTube/Vimeo embed URL (for type: video)
xiaohongshuUrl: https://www.xiaohongshu.com/...   # link to original post if applicable
status: published             # draft | published
---

Post body goes here. For galleries, a short intro paragraph is enough.
