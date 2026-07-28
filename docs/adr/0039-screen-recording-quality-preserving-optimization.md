# 39. Quality-Preserving Screen Recording Compression Optimization Strategy

* Status: accepted
* Date: 2026-07-28

## Context and Problem Statement

When users compress 60 FPS AV1 / H.264 desktop screen recordings (e.g., coding tutorials, OBS screen captures), standard constant-bitrate (CBR) downscaling or aggressive resolution reduction often leads to blurred code text or unnecessarily large file sizes. We need a strategy to achieve maximum size reduction while guaranteeing zero visual quality loss for text and UI elements.

## Decision Drivers

* Maintain 1:1 pixel sharpness for code text and UI boundaries.
* Maximize file size reduction on static desktop scenes.
* Provide explicit visual feedback comparing original file properties vs. optimized target parameters.
* Allow full user override control over all automated recommendations.

## Considered Options

* **Option 1**: Keep standard 60 FPS CBR with fixed bitrates.
* **Option 2**: Apply automated non-destructive optimization parameters (30 FPS default, 5s Keyframe Interval / GOP, VBR Bitrate Mode, and 64kbps Voice Audio) with clear UI side-by-side comparison and override controls.

## Decision Outcome

Chosen Option: **Option 2**.

### Implementation Rules

1. **Frame Rate (30 FPS Default)**:
   - For `screen` recording sources detected at high frame rates (e.g., 60 FPS), default output frame rate to 30 FPS.
   - UI displays original FPS vs recommended 30 FPS with 1-click toggle to restore 60 FPS.

2. **Keyframe Interval (5-Second GOP)**:
   - Pass `keyframeInterval: 5` to `mediabunny` / WebCodecs VideoEncoder to minimize heavy I-Frame frequency on static desktop scenes.
   - UI indicates original keyframe interval vs recommended 5s setting.

3. **Bitrate Mode (Variable Bitrate VBR)**:
   - Default `bitrateMode: 'variable'` for screen recording profiles, allowing dynamic bitrate reduction during static moments without loss of visual sharpness.
   - UI presents clear side-by-side comparison of source bitrate mode vs VBR mode.

4. **Audio Rate Optimization (64kbps Voice Baseline)**:
   - Default audio rate to 64 kbps AAC/Opus optimized for speech, with automated silent-track detection warning to suggest audio stripping.
   - UI presents original vs optimized audio settings with override options.

## Consequences

* **Positive**: Up to 60%-75% cumulative size reduction on 60 FPS desktop screen recordings without any text blurriness or perceptible visual degradation.
* **Positive**: High transparency with explicit UI source-vs-target comparisons.
* **Negative**: Slightly slower seeking (up to ~0.5s delay) when dragging video timeline due to 5s GOP interval.
