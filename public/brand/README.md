# Roost Brand Assets

## To swap the logo
1. Add your final SVG to this folder as:
   - roost-icon.svg        (icon only, square)
   - roost-wordmark.svg    (full logo with wordmark)
   - roost-icon-red.svg    (red background version)
2. Update src/components/shared/RoostLogo.tsx to use
   next/image pointing at these files instead of
   the inline SVG placeholder.
3. That's it. Every page updates automatically.

## App Store icon
- roost-appstore.png should be 1024x1024px
- No rounded corners (App Store applies them)
- Red background (#EF4444) with white rooster on house

## Required sizes (auto-generated from icon.svg)
- 1024x1024 App Store
- 180x180 iPhone
- 167x167 iPad Pro
- 152x152 iPad
- 120x120 iPhone retina
