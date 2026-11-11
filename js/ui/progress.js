export function setProgress(elNode, { percent = 0, key = '', status = '' } = {}) {
  if (!elNode) return;
  elNode.hidden = false;
  elNode.setAttribute('role', 'progressbar');
  elNode.setAttribute('aria-valuemin', '0');
  elNode.setAttribute('aria-valuemax', '100');
  elNode.setAttribute('aria-valuenow', String(percent));
  elNode.querySelector('[data-bar]')?.style.setProperty('--p', `${percent}%`);
  const label = elNode.querySelector('[data-label]');
  if (label) {
    const st = status ? ` · ${status}` : '';
    label.textContent = key ? `${percent}% · ${key}${st}` : `${percent}%`;
  }
}
