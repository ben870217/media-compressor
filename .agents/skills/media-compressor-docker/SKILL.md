---
name: media-compressor-docker-execution
description: Commands and instructions for running tasks in the media-compressor docker container.
---

# Media Compressor Docker Execution Skill

Use this skill when you need to execute commands (npm installation, dev server checks, linting, or production builds) in the Media Compressor project workspace.

## Docker Environment Setup
- Container Name: `media-compressor-dev`
- Workspace root mapped to: `/app`
- App root directory: `/app/media-compressor`

## Running Common Commands
When running any of the following, always prefix with `docker exec -w /app/media-compressor media-compressor-dev`:

### 1. Install Dependencies
```bash
docker exec -w /app/media-compressor media-compressor-dev npm install <package_name>
```

### 2. Linting Code
```bash
docker exec -w /app/media-compressor media-compressor-dev npm run lint
```

### 3. Build Web Application
```bash
docker exec -w /app/media-compressor media-compressor-dev npm run build
```

### 4. Testing & Checks
To run code checks or inspect files/directories/node modules in the container context:
```bash
docker exec -w /app/media-compressor media-compressor-dev npm run test
```
