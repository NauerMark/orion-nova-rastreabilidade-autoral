// Keep keyboard position when the board replaces its controls.
// IDs describe actions, so translated labels and changing values do not move focus.
export function renderBoardPreservingFocus(board, render) {
  const doc = board.ownerDocument;
  const active = doc.activeElement;
  const focusedId = board.contains(active) ? active.id : '';
  const order = [...board.querySelectorAll('button,input,select,summary')].map(n => n.id);
  const position = order.indexOf(focusedId);
  const siblings = focusedId
    ? [...(active.closest('.stepper')?.querySelectorAll('button') || [])].map(n => n.id)
    : [];
  const source = board.querySelector('#mission-source');
  const sourceOpen = source?.open;

  render();

  const newSource = board.querySelector('#mission-source');
  if (newSource && sourceOpen !== undefined) newSource.open = sourceOpen;
  if (!focusedId) return;

  // At 0 or 6, prefer the other button in the same stepper. Otherwise continue
  // from the old position, then backtrack; never restart at the top of the page.
  const candidates = [focusedId, ...siblings,
    ...order.slice(position + 1), ...order.slice(0, position).reverse()];
  for (const id of new Set(candidates)) {
    const target = id && doc.getElementById(id);
    if (!target || !board.contains(target) || target.disabled) continue;
    target.focus({preventScroll:true});
    if (doc.activeElement === target) return;
  }
}
