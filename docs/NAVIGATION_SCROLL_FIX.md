# Tab navigation scroll correction

The live desktop app moved the page 66 pixels after a route click because focusing main implicitly scrolled it into view. Routes now start at the page top and main receives focus with preventScroll. Contextual journal record scrolling remains supported.

Regression reproduced before the fix in Chromium and WebKit (67 pixels locally). All 22 main UX checks pass after correction, including desktop/mobile route stability, keyboard search, journal context, overlays and notifications. Build and source checks pass.

Lesson: programmatic focus is also a scroll operation unless preventScroll is explicit. Verify shell geometry as well as focused elements across route changes.
