# Project Rules for Media Compressor

These rules govern agent behavior and design guidelines when working in this repository.

## 1. Docker Command Enforcement
- **Constraint**: The development environment, Node.js runtime, and all node_modules are located within the Docker Compose container `media-compressor-dev`.
- **Command Prefix**: All shell commands, scripts, dependencies management, and validation tasks must be executed inside the container using the following prefix:
  ```bash
  docker exec -w /app/media-compressor media-compressor-dev <command>
  ```
- **Examples**:
  - Install dependencies: `docker exec -w /app/media-compressor media-compressor-dev npm install <package>`
  - Run linter: `docker exec -w /app/media-compressor media-compressor-dev npm run lint`
  - Build project: `docker exec -w /app/media-compressor media-compressor-dev npm run build`
- **Rationale**: Prevent platform-specific compilation issues (e.g. Windows native addons vs. Alpine Linux musl libc node_modules).

## 2. Responsive Web Design (RWD) Guidelines
- **Target Viewports**: Desktop, Mobile, and Tablet.
- **Breakpoints**: Use the established responsive layout breakpoints in css styles:
  - Max-width: `735px` (Tablet/Small Screen layout adjustments)
  - Max-width: `580px` (Mobile landscape adjustments)
  - Max-width: `480px` (Mobile portrait adjustments)
- **Design Tokens**: Reuse CSS custom properties declared in `src/App.jsx` for all styles (e.g. `--apple-primary`, `--apple-ink`, `--apple-hairline`). Do not introduce ad-hoc colors or typography.
- **Touch Targets**: Ensure sliders, option chips, and buttons are spacious enough for touch control on mobile devices, with clear active and hover states.

## 3. Offline & Security Constraints
- **Intranet Readiness**: The application must be able to run in a strict offline, air-gapped intranet environment.
- **No External Services**: Do not integrate external AI models, remote APIs, external fonts, or asset CDNs.
- **Client-Side execution**: All media compression tasks (image, video, etc.) must run locally in the browser sandbox (e.g. via Web Workers, Canvas, or client-side packages like `mediabunny`).
