import { CATEGORIES, GAUGE_BOUNDS } from './bmi.js';

const BANDS = Object.freeze([
  { key: 'underweight', from: GAUGE_BOUNDS.min, to: 18.5 },
  { key: 'healthy', from: 18.5, to: 25 },
  { key: 'overweight', from: 25, to: 30 },
  { key: 'obesity1', from: 30, to: 35 },
  { key: 'obesity2', from: 35, to: 40 },
  { key: 'obesity3', from: 40, to: GAUGE_BOUNDS.max },
]);

const GEOMETRY = Object.freeze({
  cx: 160,
  cy: 150,
  radius: 120,
  gap: 0.35,
});

function polarPoint(value) {
  const bounded = Math.min(GAUGE_BOUNDS.max, Math.max(GAUGE_BOUNDS.min, value));
  const progress = (bounded - GAUGE_BOUNDS.min) / (GAUGE_BOUNDS.max - GAUGE_BOUNDS.min);
  const angle = Math.PI * (1 - progress);
  return {
    x: GEOMETRY.cx + GEOMETRY.radius * Math.cos(angle),
    y: GEOMETRY.cy - GEOMETRY.radius * Math.sin(angle),
  };
}

function arcPath(fromValue, toValue) {
  const from = polarPoint(fromValue + GEOMETRY.gap);
  const to = polarPoint(toValue - GEOMETRY.gap);
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${GEOMETRY.radius} ${GEOMETRY.radius} 0 0 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

export class BmiGauge {
  constructor(segmentsElement, needleElement) {
    this.segmentsElement = segmentsElement;
    this.needleElement = needleElement;
    this.angle = 0;
    this.frame = null;
    this.drawSegments();
  }

  drawSegments() {
    if (!this.segmentsElement) return;
    const doc = this.segmentsElement.ownerDocument;
    const namespace = 'http://www.w3.org/2000/svg';
    this.segmentsElement.replaceChildren();

    BANDS.forEach((band) => {
      if (!CATEGORIES.some((category) => category.key === band.key)) return;
      const path = doc.createElementNS(namespace, 'path');
      path.setAttribute('d', arcPath(band.from, band.to));
      path.setAttribute('class', `gauge-segment gauge-segment--${band.key}`);
      this.segmentsElement.appendChild(path);
    });
  }

  setAngle(angle) {
    this.angle = angle;
    this.needleElement?.setAttribute(
      'transform',
      `rotate(${angle.toFixed(2)} ${GEOMETRY.cx} ${GEOMETRY.cy})`,
    );
  }

  reset() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.setAngle(0);
  }

  update(bmi, { animate = true } = {}) {
    if (!this.needleElement || !Number.isFinite(bmi)) return;
    const bounded = Math.min(GAUGE_BOUNDS.max, Math.max(GAUGE_BOUNDS.min, bmi));
    const progress = (bounded - GAUGE_BOUNDS.min) / (GAUGE_BOUNDS.max - GAUGE_BOUNDS.min);
    const target = progress * 180;
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;

    if (!animate || reduceMotion) {
      this.setAngle(target);
      return;
    }

    const startAngle = this.angle;
    const startTime = performance.now();
    const duration = 720;

    const tick = (now) => {
      const progressTime = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progressTime) ** 3;
      this.setAngle(startAngle + (target - startAngle) * eased);
      if (progressTime < 1) {
        this.frame = requestAnimationFrame(tick);
      } else {
        this.frame = null;
      }
    };

    this.frame = requestAnimationFrame(tick);
  }
}
