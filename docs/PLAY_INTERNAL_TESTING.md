# Play Internal Testing

Use this checklist for the first Google Play internal testing track build.

## Play Console Setup

- Create the Play Console app.
- Use package ID `com.tap.survivor`.
- App type: Game.
- Pricing: Free.
- Ads: No.
- IAP: No for current build.
- Upload the signed AAB to internal testing.
- Add internal testers.
- Install from the internal testing link.
- Verify the installed version/build matches the local release candidate.
- Record tester feedback.
- Bump `versionCode` for every future upload.

## Android Phone Checklist

- App launches.
- Tap-to-move works.
- Auto-attacks work.
- XP works.
- Level-up works.
- Quest progress works.
- Save persists after close/reopen.
- Save persists after force-close/reopen.
- Screen scaling is acceptable.
- Android back behaviour is acceptable.
