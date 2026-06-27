# Firebase setup

## 1. Create the web app

1. Open the Firebase console and select your project (or create one).
2. In **Project settings → General → Your apps**, choose the Web (`</>`) icon.
3. Register the app. Firebase Hosting is not required because this site uses GitHub Pages.
4. Copy the values from the displayed `firebaseConfig` object.

## 2. Add local configuration

Copy `.env.example` to `.env.local`, then replace every placeholder with the matching value from `firebaseConfig`.

```sh
cp .env.example .env.local
```

Restart `npm run dev` after changing `.env.local`.

## 3. Enable Google login

1. Open **Authentication → Sign-in method**.
2. Enable **Google** and select a support email.
3. Under **Authentication → Settings → Authorized domains**, add `friendlypenguin.org`.
4. `localhost` is normally present already; add it if it is missing.

## 4. Create Firestore

1. Open **Firestore Database → Create database**.
2. Choose **Standard edition** and **Production mode**.
3. Choose the database location carefully; it cannot be changed later. Pick a location near the majority of users.
4. In **Firestore Database → Rules**, replace the rules with the contents of `firestore.rules`, then publish them.

The rules allow a signed-in user to read and write only this path:

```text
users/{their-user-id}/diagrams/{diagram-id}
```

## 5. Deploy

The existing `npm run deploy` command builds on your computer, so it reads `.env.local` before publishing to GitHub Pages. If you later switch to GitHub Actions, add the six `VITE_FIREBASE_*` values as repository Actions secrets or variables and expose them during the Vite build.

Firebase web configuration identifies the project and is expected to be present in the built website. Firestore Security Rules provide the actual data protection.
