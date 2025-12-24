# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Shipping

Tag a release (e.g., `v1.2.3`) and push the tag to trigger the release workflow:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

Build artifacts are uploaded to GitHub Releases as `dist.zip` (and `specs.zip` when present).

## UI Roadmap (Draft)

- [FixtureCard evolution](docs/ui/fixturecard-evolution.md)
