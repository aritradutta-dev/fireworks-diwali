import {
  GestureType,
  HandPose,
  ScreenLandmark,
  DetectedGesture
} from './gestureTypes';

interface TrajectoryPoint {
  x: number;
  y: number;
  time: number;
}

export class GestureClassifier {
  // Trajectory buffer per hand index
  private indexTrajectories: Map<number, TrajectoryPoint[]> = new Map();
  private lastCircleTriggerTime: Map<number, number> = new Map();

  // Gesture hold tracking for debouncing
  private pendingGesture: Map<number, { type: GestureType; since: number }> = new Map();
  private lastFiredTime: Map<string, number> = new Map();

  // Cooldowns (ms)
  private readonly COOLDOWNS: Record<GestureType, number> = {
    NONE: 0,
    ROCKET: 550, // Dedicated cooldown for single rocket shots
    ANAR: 0, // Continuous
    STARBURST: 850,
    ROMAN_CANDLE: 300,
    PHOOLJHADI: 0, // Continuous
    CHAKRI: 1200, // Cooldown so it doesn't double-trigger
    GRAND_FINALE: 3000
  };

  private readonly HOLD_REQUIRED_MS = 100;

  public classify(hands: HandPose[], screenW: number, _screenH: number): DetectedGesture[] {
    const now = performance.now();
    const results: DetectedGesture[] = [];

    // 1. Dual-Hand Check: Grand Finale (Priority 1)
    if (hands.length >= 2) {
      const h1 = hands[0];
      const h2 = hands[1];
      if (this.isAllFingersExtended(h1) && this.isAllFingersExtended(h2)) {
        if (this.canTrigger('GRAND_FINALE', now)) {
          results.push({
            type: 'GRAND_FINALE',
            confidence: 0.98,
            triggerPoint: {
              x: (h1.palmCenter.x + h2.palmCenter.x) / 2,
              y: (h1.palmCenter.y + h2.palmCenter.y) / 2
            },
            handIndex: -1,
            isContinuous: false
          });
          this.markFired('GRAND_FINALE', now);
          return results;
        }
      }
    }

    // 2. Single-Hand Gestures
    hands.forEach((hand, idx) => {
      const gesture = this.classifySingleHand(hand, idx, now, screenW);
      if (gesture) {
        results.push(gesture);
      }
    });

    return results;
  }

  private classifySingleHand(
    hand: HandPose,
    handIndex: number,
    now: number,
    screenW: number
  ): DetectedGesture | null {
    const { extendedFingers, landmarks, isPinching, palmCenter } = hand;
    const wrist = landmarks[0];
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Priority 2: Phooljhadi (Pinch) — Evaluated before single fingers
    if (isPinching) {
      this.pendingGesture.delete(handIndex);
      return {
        type: 'PHOOLJHADI',
        confidence: 0.95,
        triggerPoint: {
          x: (indexTip.x + thumbTip.x) / 2,
          y: (indexTip.y + thumbTip.y) / 2
        },
        handIndex,
        handedness: hand.handedness,
        isContinuous: true
      };
    }

    // Record trajectory for circular motion detection
    this.recordTrajectory(handIndex, indexTip, now);

    // Check if hand is currently performing circular motion
    const isCircling = this.detectCircularMotion(handIndex, now, screenW);

    // Direction check for index finger: pointing UP vs pointing DOWN
    const isIndexPointingUp = indexTip.y < indexPip.y - 12 && indexTip.y < wrist.y - 20;
    const isIndexPointingDown = indexTip.y > indexPip.y + 12 && indexTip.y > wrist.y + 10;

    let candidate: GestureType = 'NONE';
    let triggerPoint = { x: indexTip.x, y: indexTip.y };
    let isContinuous = false;

    // Priority 3: Chakri (Ground Spinner)
    // Triggered EITHER by index pointing DOWN 👇 (ground spinner!) OR by completed circle trace
    if ((isIndexPointingDown || isCircling) && !extendedFingers.pinky && !extendedFingers.ring) {
      if (this.canTrigger('CHAKRI', now, handIndex)) {
        this.markFired('CHAKRI', now, handIndex);
        return {
          type: 'CHAKRI',
          confidence: 0.92,
          // Spawns beneath the finger on the ground
          triggerPoint: { x: indexTip.x, y: Math.max(indexTip.y, palmCenter.y + 30) },
          handIndex,
          handedness: hand.handedness,
          isContinuous: false
        };
      }
    }
    // Priority 4: Rocket (☝️ Index Pointing UP only)
    // Crucial: Only trigger if index is strictly pointing UP and NOT circling!
    else if (
      extendedFingers.index &&
      isIndexPointingUp &&
      !isCircling &&
      !extendedFingers.middle &&
      !extendedFingers.ring &&
      !extendedFingers.pinky
    ) {
      candidate = 'ROCKET';
      triggerPoint = { x: indexTip.x, y: indexTip.y };
      isContinuous = false;
    }
    // Priority 5: Roman Candle (✌️ Peace Sign: Both Index & Middle pointing UP)
    else if (
      extendedFingers.index &&
      extendedFingers.middle &&
      isIndexPointingUp &&
      !extendedFingers.ring &&
      !extendedFingers.pinky
    ) {
      candidate = 'ROMAN_CANDLE';
      const middleTip = landmarks[12];
      triggerPoint = {
        x: (indexTip.x + middleTip.x) / 2,
        y: (indexTip.y + middleTip.y) / 2
      };
      isContinuous = false;
    }
    // Priority 6: Anar (✊ Closed Fist: All fingers curled into palm)
    else if (
      !extendedFingers.index &&
      !extendedFingers.middle &&
      !extendedFingers.ring &&
      !extendedFingers.pinky &&
      !extendedFingers.thumb
    ) {
      candidate = 'ANAR';
      const fistTop = landmarks[9] || palmCenter;
      triggerPoint = { x: fistTop.x, y: fistTop.y - 10 };
      isContinuous = true;
    }
    // Priority 7: Starburst (✋ Open Palm: All 5 fingers extended spread apart)
    else if (this.isAllFingersExtended(hand)) {
      candidate = 'STARBURST';
      triggerPoint = { x: palmCenter.x, y: palmCenter.y };
      isContinuous = false;
    }

    if (candidate === 'NONE') {
      this.pendingGesture.delete(handIndex);
      return null;
    }

    // Debounce hold requirement
    const pending = this.pendingGesture.get(handIndex);
    if (!pending || pending.type !== candidate) {
      this.pendingGesture.set(handIndex, { type: candidate, since: now });
      return null;
    }

    if (now - pending.since < this.HOLD_REQUIRED_MS) {
      return null;
    }

    if (!this.canTrigger(candidate, now, handIndex)) {
      return null;
    }

    if (!isContinuous) {
      this.markFired(candidate, now, handIndex);
    }

    return {
      type: candidate,
      confidence: 0.9,
      triggerPoint,
      handIndex,
      handedness: hand.handedness,
      isContinuous
    };
  }

  private isAllFingersExtended(hand: HandPose): boolean {
    const { extendedFingers } = hand;
    return (
      extendedFingers.index &&
      extendedFingers.middle &&
      extendedFingers.ring &&
      extendedFingers.pinky
    );
  }

  private canTrigger(type: GestureType, now: number, handIdx: number = 0): boolean {
    const key = `${type}_${handIdx}`;
    const lastTime = this.lastFiredTime.get(key) || 0;
    const cooldown = this.COOLDOWNS[type];
    return now - lastTime >= cooldown;
  }

  private markFired(type: GestureType, now: number, handIdx: number = 0): void {
    const key = `${type}_${handIdx}`;
    this.lastFiredTime.set(key, now);
  }

  private recordTrajectory(handIdx: number, pt: ScreenLandmark, now: number): void {
    let list = this.indexTrajectories.get(handIdx);
    if (!list) {
      list = [];
      this.indexTrajectories.set(handIdx, list);
    }
    list.push({ x: pt.x, y: pt.y, time: now });

    // Keep last 450ms
    const cutoff = now - 450;
    while (list.length > 0 && list[0].time < cutoff) {
      list.shift();
    }
  }

  private detectCircularMotion(handIdx: number, now: number, screenW: number): boolean {
    const list = this.indexTrajectories.get(handIdx);
    if (!list || list.length < 14) return false;

    const lastCircle = this.lastCircleTriggerTime.get(handIdx) || 0;
    if (now - lastCircle < 1000) return false;

    let sumX = 0;
    let sumY = 0;
    for (const pt of list) {
      sumX += pt.x;
      sumY += pt.y;
    }
    const cx = sumX / list.length;
    const cy = sumY / list.length;

    let sumRadius = 0;
    const angles: number[] = [];

    for (const pt of list) {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      sumRadius += Math.hypot(dx, dy);
      angles.push(Math.atan2(dy, dx));
    }

    const avgRadius = sumRadius / list.length;
    if (avgRadius < 35 || avgRadius > screenW * 0.25) return false;

    let totalAngle = 0;
    for (let i = 1; i < angles.length; i++) {
      let diff = angles[i] - angles[i - 1];
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      totalAngle += diff;
    }

    if (Math.abs(totalAngle) >= 4.8) {
      this.lastCircleTriggerTime.set(handIdx, now);
      list.length = 0;
      return true;
    }

    return false;
  }
}
