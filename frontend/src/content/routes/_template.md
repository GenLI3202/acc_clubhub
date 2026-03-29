---
# REQUIRED FIELDS
slug: my-route               # URL path: /[lang]/routes/[slug] — kebab-case
name: Route Name
distance: 120                # numeric, kilometres
elevation: 1800              # numeric, metres
difficulty: hard             # easy | medium | hard | expert

# DIFFICULTY GUIDE:
# easy   → <60km, <400m elevation
# medium → 60-100km, 400-1000m
# hard   → 100-150km, 1000-2000m
# expert → >150km, >2000m

# REGION
region: alps-bavaria         # munich-south | munich-north | alps-bavaria | alps-austria | alps-italy | island-spain

# EXTERNAL LINKS — at least one required
stravaUrl: https://www.strava.com/routes/...
komootUrl: https://www.komoot.com/tour/...

# OPTIONAL FIELDS
description: Short one-sentence description shown in cards and meta tags.
author: ACC Club              # defaults to 'ACC Club' if omitted
coverImage: /images/uploads/your-image.jpg
surface: tarmac              # tarmac | gravel | mixed
gpxFile: /gpx/my-route.gpx   # upload GPX file to public/gpx/
xiaohongshuUrl: https://www.xiaohongshu.com/...
status: published             # draft | published
---

Route description goes here. Describe highlights, key climbs, surface conditions.
