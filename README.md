# Dhivehi Foiy v3

A ground-up rewrite of the Dhivehi Foiy reader app (`../dhivehi-foiy-v2`) on **Expo SDK 57 / React Native 0.86 (New Architecture)**.
It uses the same backend, OAuth client, Firebase project, bundle ids (`com.xylamtech.books`) and EAS project, so it ships as
an update to the existing store listing, and a user signed in on v2 stays signed in (same `access-token` key in encrypted storage).

## Run

```bash
npm install
npx expo prebuild --clean
npx expo run:android   # or: npx expo run:ios
```

This app needs a development build because of its native modules (PDF, track player, Google sign-in, Firebase). Expo Go won't work.
EAS profiles are unchanged from v2 (`eas build --profile development|preview|production`).

## What carried over from v2

- Google sign-in on Android and Apple sign-in on iOS, through the same `/oauth/token` social grant.
- Automatic sign-out on a 401, as before.
- Home rails: slides, popular, for sale, audio, authors, magazines, categories, free.
- Search, genres, collections, authors with their social links, "see all" lists on the same seeded `/books/randomize` endpoint, and CMS pages.
- Purchases through the BML payment web view, with the same redirect rules.
- Previews and free books.
- The protected reader. It uses the same stream URL, `id` hashing and PDF password scheme as v2.
- **Screenshot and screen-recording prevention** (`expo-screen-capture`).
- Jailbreak, root and hook detection. On a compromised device the reader is blocked, as in v2.
- Printing for printable books. The temporary print file is now deleted after printing.
- Audio books: chapter queue, playback speed, lock-screen controls. The mini player now floats above the tab bar.
- Push notifications with deep links. Offline launch opens the library.
- Light and dark mode.

## New in v3

| Area | What it does |
|---|---|
| **Encrypted offline downloads** | You can download owned and free books. Each file is encrypted with AES-256-GCM in 1 MiB chunks, and each chunk is tied to its book, position and end-of-file marker. The key is created on the device and stored in the Keychain or Keystore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Files sit in the app's private storage, and Android backups are turned off. A copied file can't be opened anywhere else. See `src/lib/vault.ts`. |
| Download management | Queue with progress and cancel, a disk-space check, a storage summary, and per-book or bulk delete (`/downloads`). Logging out wipes downloads. If a different account signs in on the device, downloads are wiped too. |
| **Bookmarks** | Stored locally only. Toggle from the reader, add notes and edit them, browse bookmarks per book or across all books (`/bookmarks`), and jump straight to the page. |
| Reader | Resumes where you left off. Includes a page scrubber, a go-to-page sheet and the table of contents (PDF outline). Choose vertical scroll or page-by-page (right-to-left paging on iOS), and fit to width or to page. Sepia, night and dimming filters change only what you see, never the book. Other options: keep the screen awake, lock rotation, and tap to enter immersive mode. Text selection is off. External links in books are ignored. |
| Extra protection | The reader turns on iOS app-switcher blur and shows a privacy cover whenever the app is in the background. iOS shows a screenshot warning. Decrypted copies exist only while the reader is open and are cleared again at the next app start. |
| Continue reading | A home rail with progress bars. Library cards show reading progress and download state. |
| Audio | A sleep timer (minutes, or at the end of the chapter), ±15 s skips, and a fix for chapter ordering. v2 queued chapters in an unawaited `map`, so their order was random. |
| UI | Native right-to-left layout (`forcesRTL`), Dhivehi typography (MV Waheed / MV Faseyha), shared-element cover transitions (Reanimated), spring press feedback, haptics, skeleton loaders, a frosted floating tab bar, bottom sheets, toasts, parallax book pages, pull to refresh, and a theme setting (system, light or dark). |

## Structure

```
app/                 expo-router screens (route names unchanged so v2 deep links still work)
src/lib/             api (v2 Request port), vault (crypto), downloads, library (bookmarks/progress), settings, reader helpers
src/components/      ui primitives (Txt, Sheet, Toast, PressableScale…) and book components
src/reader/          reader sheets (settings, bookmarks, go-to-page, contents)
src/audio/           track-player provider, mini player, playback service
```

## Notes

- Shared-element transitions are enabled through `package.json → reanimated.staticFeatureFlags.ENABLE_SHARED_ELEMENT_TRANSITIONS`. This takes effect after a native rebuild.
- `react-native-track-player` and `react-native-encrypted-storage` are kept from v2 even though `expo-doctor` flags them. Encrypted storage holds the existing users' session token.
- On Android, react-native-pdf reloads the document whenever a native prop changes. Because of that, the reader freezes every `<Pdf>` prop and remounts it (at the current page) when you change a layout setting.
