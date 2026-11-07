# Ticket 02: Fast Vision Engine & Gesture Classifier

## Intent
Integrate `@mediapipe/tasks-vision` using the ultra-fast pipeline: float16 quantized HandLandmarker, 640x480 video constraint, `runningMode: "VIDEO"` with GPU delegate, OneEuro / temporal landmark smoothing, and 7-gesture classification with stabilization debounce window.

## Acceptance Criteria
- [ ] `@mediapipe/tasks-vision` loaded with `float16` hand landmarker model.
- [ ] Boots in < 1.5 seconds on modern browsers.
- [ ] Hand landmarks tracked in real-time at 30-60fps with handedness and 21 keypoints.
- [ ] 7 gestures classified accurately:
  1. Rocket (index extended)
  2. Anar / Fountain (closed fist)
  3. Starburst (all 5 fingers spread)
  4. Roman Candle (peace sign)
  5. Phooljhadi / Sparkler (thumb-index pinch)
  6. Chakri (index circular trajectory)
  7. Grand Finale (both hands open palms)
- [ ] 100ms hold debounce + 50ms grace window to eliminate false transition triggers.
- [ ] Optional debug wireframe overlay toggle (`D` hotkey).
