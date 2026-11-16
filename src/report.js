import { formatBmi } from './bmi.js';
import { t } from './i18n.js';
import {
  escapeHtml,
  formatDate,
  formatHealthyRange,
  formatHeight,
  formatWeight,
} from './format.js';

export function buildReportHtml({ language, unit, result, history, age, now = Date.now() }) {
  const primary = result
    ? {
        bmi: result.bmi,
        categoryKey: result.categoryKey,
        weightKg: result.weightKg,
        heightCm: result.heightCm,
        age,
        ts: now,
      }
    : history[0] ?? null;

  if (!primary) return '';

  const tr = (key, variables) => escapeHtml(t(language, key, variables));
  const primaryLabel = result ? 'print.resultTitle' : 'print.latestSaved';
  const categoryLabel = t(language, `cat.${primary.categoryKey}`);
  const healthyWeight = getHealthyWeightLabel(primary.heightCm, unit);

  const ageLine = Number.isInteger(primary.age)
    ? `<div><dt>${tr('print.ageLabel')}</dt><dd>${primary.age}</dd></div>`
    : '';

  const historyRows = history
    .slice(0, 10)
    .map((entry) => `
      <tr>
        <td>${escapeHtml(formatDate(entry.ts, language))}</td>
        <td>${escapeHtml(formatBmi(entry.bmi))}</td>
        <td>${escapeHtml(t(language, `cat.${entry.categoryKey}`))}</td>
        <td>${escapeHtml(formatWeight(entry.weightKg, unit))}</td>
        <td>${escapeHtml(formatHeight(entry.heightCm, unit))}</td>
      </tr>`)
    .join('');

  const historySection = history.length
    ? `
      <section class="report-history">
        <h2>${tr('print.historyTitle')}</h2>
        <table class="report-table">
          <thead>
            <tr>
              <th scope="col">${tr('print.date')}</th>
              <th scope="col">${tr('print.bmiLabel')}</th>
              <th scope="col">${tr('print.categoryLabel')}</th>
              <th scope="col">${tr('print.weightLabel')}</th>
              <th scope="col">${tr('print.heightLabel')}</th>
            </tr>
          </thead>
          <tbody>${historyRows}</tbody>
        </table>
      </section>`
    : '';

  return `
    <div class="report-header">
      <div class="report-brand">
        <span class="report-mark" aria-hidden="true">BB</span>
        <div>
          <strong>Black Box</strong>
          <span>${tr('print.brandTagline')}</span>
        </div>
      </div>
      <div class="report-header-meta">Black Box<br>${tr('print.pageNote')}</div>
    </div>

    <h1 class="report-title">${tr('print.title')}</h1>
    <p class="report-generated">${tr('print.generated', { date: formatDate(now, language) })} · ${tr(primaryLabel)}</p>

    <div class="report-summary">
      <section class="report-block">
        <h2>${tr(primaryLabel)}</h2>
        <div class="report-big">
          <strong>${escapeHtml(formatBmi(primary.bmi))}</strong>
          <span>${tr('result.bmiUnit')}</span>
        </div>
        <span class="report-category">${escapeHtml(categoryLabel)}</span>
        <dl class="report-details">
          <div><dt>${tr('print.weightLabel')}</dt><dd>${escapeHtml(formatWeight(primary.weightKg, unit))}</dd></div>
          <div><dt>${tr('print.heightLabel')}</dt><dd>${escapeHtml(formatHeight(primary.heightCm, unit))}</dd></div>
          ${ageLine}
        </dl>
      </section>
      <section class="report-block">
        <h2>${tr('print.healthyWeightLabel')}</h2>
        <dl class="report-details">
          <div><dt>${tr('print.healthyWeightLabel')}</dt><dd>${escapeHtml(healthyWeight)}</dd></div>
          <div><dt>${tr('print.healthyBmiLabel')}</dt><dd>18.5–24.9 ${tr('result.bmiUnit')}</dd></div>
        </dl>
      </section>
    </div>

    <section class="report-guidance">
      <h2>${tr('print.adviceLabel')}</h2>
      <p>${tr(`cat.${primary.categoryKey}.advice`)}</p>
    </section>

    ${historySection}

    <footer class="report-footer">
      <h2>${tr('print.disclaimerTitle')}</h2>
      <p>${tr('print.disclaimerText')}</p>
      <p class="report-privacy">${tr('print.privacy')}</p>
    </footer>`;
}

function getHealthyWeightLabel(heightCm, unit) {
  const heightM = heightCm / 100;
  const minKg = 18.5 * heightM * heightM;
  const maxKg = 24.9 * heightM * heightM;
  return formatHealthyRange(minKg, maxKg, unit);
}
