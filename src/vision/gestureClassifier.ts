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
  // Trajectory buffer per hand index (0: left/first, 1: right/second)
  private indexTrajectories: Map<number, TrajectoryPoint[]> = new Map();
  private lastCircleTriggerTime: Map<number, number> = new Map();

  // Gesture hold tracking for debouncing
  private pendingGesture: Map<number, { type: GestureType; since: number }> = new Map();
  private lastFiredTime: Map<string, number> = new Map();

  // Cooldowns (ms)
  private readonly COOLDOWNS: Record<GestureType, number> = {
    NONE: 0,
    ROCKET: 450,
    ANAR: 0, // Continuous
    STARBURST: 650,
    ROMAN_CANDLE: 320, // Rapid shots
    PHOOLJHADI: 0, // Continuous
    CHAKRI: 800,
    GRAND_FINALE: 2200
  };

  private readonly HOLD_REQUIRED_MS = 90;

  /**
   * Main classifier pass across detected hands.
   * Returns active gestures ready to ignite fireworks.
   */
  public classify(hands: HandPose[], screenW: number, screenH: number): DetectedGesture[] {
    const now = performance.now();
    const results: DetectedGesture[] = [];

    // 1. Dual-Hand Check: Grand Finale (Priority 1)
    if (hands.length >= 2) {
      const h1 = hands[0];
      const h2 = hands[1];
      const h1AllOpen = this.isAllFingersExtended(h1);
      const h2AllOpen = this.isAllFingersExtended(h2);

      if (h1AllOpen && h2AllOpen) {
        if (this.canTrigger('GRAND_FINALE', now)) {
          results.push({
            type: 'GRAND_FINALE',
            confidence: 0.95,
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
      const gesture = this.classifySingleHand(hand, idx, now, screenW, screenH);
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
    screenW: number,
    _screenH: number
  ): DetectedGesture | null {
    const { extendedFingers, landmarks, isPinching, palmCenter } = hand;
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Priority 2: Chakri (Index circular motion check)
    // Only check if index is extended and ring + pinky are mostly curled
    if (extendedFingers.index && !extendedFingers.pinky) {
      this.recordTrajectory(handIndex, indexTip, now);
      if (this.detectCircularMotion(handIndex, now, screenW)) {
        if (this.canTrigger('CHAKRI', now, handIndex)) {
          this.markFired('CHAKRI', now, handIndex);
          return {
            type: 'CHAKRI',
            confidence: 0.9,
            triggerPoint: { x: indexTip.x, y: indexTip.y },
            handIndex,
            handedness: hand.handedness,
            isContinuous: false
          };
        }
      }
    }

    // Determine Candidate Gesture
    let candidate: GestureType = 'NONE';
    let triggerPoint = { x: indexTip.x, y: indexTip.y };
    let isContinuous = false;

    // Priority 3: Phooljhadi (Pinch)
    if (isPinching) {
      candidate = 'PHOOLJHADI';
      triggerPoint = {
        x: (indexTip.x + thumbTip.x) / 2,
        y: (indexTip.y + thumbTip.y) / 2
      };
      isContinuous = true;
    }
    // Priority 4: Rocket (Index only up)
    else if (
      extendedFingers.index &&
      !extendedFingers.middle &&
      !extendedFingers.ring &&
      !extendedFingers.pinky
    ) {
      candidate = 'ROCKET';
      triggerPoint = { x: indexTip.x, y: indexTip.y };
      isContinuous = false;
    }
    // Priority 5: Roman Candle (Peace Sign: index + middle up)
    else if (
      extendedFingers.index &&
      extendedFingers.middle &&
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
    // Priority 6: Anar (Closed Fist: no fingers extended)
    else if (
      !extendedFingers.index &&
      !extendedFingers.middle &&
      !extendedFingers.ring &&
      !extendedFingers.pinky &&
      !extendedFingers.thumb
    ) {
      candidate = 'ANAR';
      // Fountain sprays upward from the top of the fist (middle MCP landmark 9)
      const fistTop = landmarks[9] || palmCenter;
      triggerPoint = { x: fistTop.x, y: fistTop.y - 15 };
      isContinuous = true;
    }
    // Priority 7: Starburst (All 5 extended)
    else if (this.isAllFingersExtended(hand)) {
      candidate = 'STARBURST';
      triggerPoint = { x: palmCenter.x, y: palmCenter.y };
      isContinuous = false;
    }

    if (candidate === 'NONE') {
      this.pendingGesture.delete(handIndex);
      return null;
    }

    // Hysteresis & Debounce check
    const pending = this.pendingGesture.get(handIndex);
    if (!pending || pending.type !== candidate) {
      this.pendingGesture.set(handIndex, { type: candidate, since: now });
      // If continuous, require brief hold before starting
      return null;
    }

    // Has it been held long enough?
    if (now - pending.since < this.HOLD_REQUIRED_MS) {
      return null;
    }

    // Check cooldown
    if (!this.canTrigger(candidate, now, handIndex)) {
      return null;
    }

    // For non-continuous, mark fired now
    if (!isContinuous) {
      this.markFired(candidate, now, handIndex);
    }

    return {
      type: candidate,
      confidence: 0.88,
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

  /**
   * Records fingertip position history for trajectory analysis
   */
  private recordTrajectory(handIdx: number, pt: ScreenLandmark, now: number): void {
    let list = this.indexTrajectories.get(handIdx);
    if (!list) {
      list = [];
      this.indexTrajectories.set(handIdx, list);
    }
    list.push({ x: pt.x, y: pt.y, time: now });

    // Keep only last 600ms
    const cutoff = now - 600;
    while (list.length > 0 && list[0].time < cutoff) {
      list.shift();
    }
  }

  /**
   * Detects circular path (Chakri gesture) from index trajectory
   */
  private detectCircularMotion(handIdx: number, now: number, screenW: number): boolean {
    const list = this.indexTrajectories.get(handIdx);
    if (!list || list.length < 16) return false;

    // Minimum cooldown between circles
    const lastCircle = this.lastCircleTriggerTime.get(handIdx) || 0;
    if (now - lastCircle < 700) return false;

    // 1. Compute Centroid
    let sumX = 0;
    let sumY = 0;
    for (const pt of list) {
      sumX += pt.x;
      sumY += pt.y;
    }
    const cx = sumX / list.length;
    const cy = sumY / list.length;

    // 2. Calculate average radius and angular coverage
    let sumRadius = 0;
    const angles: number[] = [];

    for (const pt of list) {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      sumRadius += Math.hypot(dx, dy);
      angles.push(Math.atan2(dy, dx));
    }

    const avgRadius = sumRadius / list.length;
    // Radius must be reasonable: between 25px and 20% of screen width
    const minRadius = 25;
    const maxRadius = Math.max(180, screenW * 0.22);
    if (avgRadius < minRadius || avgRadius > maxRadius) return false;

    // 3. Accumulate total signed angular displacement
    let totalAngleChange = 0;
    for (let i = 1; i < angles.length; i++) {
      let diff = angles[i] - angles[i - 1];
      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      totalAngleChange += diff;
    }

    // Check if user completed at least ~260 degrees of rotation (~4.5 radians)
    if (Math.abs(totalAngleChange) >= 4.5) {
      this.lastCircleTriggerTime.set(handIdx, now);
      list.length = 0; // Clear trajectory once circle is confirmed
      return true;
    }

    return false;
  }
}
