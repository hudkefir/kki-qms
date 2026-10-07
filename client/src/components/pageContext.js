const recordTypes = new Set([
  'complaints', 'deviations', 'capas', 'batch-tests', 'suppliers', 'environmental',
  'ccrs', 'change-control', 'equipment', 'recalls', 'sops', 'work-orders',
  'daily-tasks', 'pick-lists', 'inventory-counts',
]);

export function buildPageContext(pathname, title) {
  const [type, id] = pathname.split('/').filter(Boolean);
  return {
    route: pathname.slice(0, 100), title: title.slice(0, 160),
    ...(recordTypes.has(type) ? { recordType: type } : {}),
    ...(recordTypes.has(type) && id && id !== 'new' && /^[\w-]{1,100}$/.test(id) ? { recordId: id } : {}),
  };
}

export function chatPayload({ messages, chatSessionId, model, sharePage = false, pathname, title }) {
  return { messages, chatSessionId, ...(model ? { model } : {}),
    ...(sharePage ? { pageContext: buildPageContext(pathname, title) } : {}) };
}
