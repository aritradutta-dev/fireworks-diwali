# Ticket 06: Capture, Reel Recording & Postcard Export

## Intent
Implement native in-browser recording via MediaRecorder multiplexing the composite fireworks canvas and procedural audio, alongside a high-res screenshot exporter with an elegant Diwali watermark.

## Acceptance Criteria
- [ ] Record button with live elapsed timer (`00:15 / 00:30`).
- [ ] Auto-stops at 30 seconds or on manual click.
- [ ] Mixes both canvas visual stream (`captureStream(30)`) and Web Audio destination track into the recorded file.
- [ ] Instant download as `.webm` file ready for sharing or Instagram/WhatsApp status.
- [ ] Screenshot button that captures the composited frame with subtle golden "✨ Happy Diwali ✨" watermark in corner.
- [ ] Creator mode hotkey `H` hides all HUD buttons for clean reel screen recordings.
