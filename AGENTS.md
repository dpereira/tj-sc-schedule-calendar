# Agent Instructions

## Project Overview

This is a static HTML calendar for a study schedule named "GO" on Gran Cursos Online (TJ SC prep). It displays 537 class events from May 4 to June 29, 2026.

The HTML is self-contained with all data embedded inline. No build step needed.

## Regenerating the calendar

If the schedule data changes (new events added, completion status updated), regenerate in two steps:

### Step 1: Extract data from Gran Cursos

Navigate to the cronograma page and extract event data from the React Query cache:

```javascript
// In browser console on the cronograma page:
var ref = window.__cronograma_app_ref;
var fiber = ref[Object.keys(ref).find(k => k.startsWith('__reactFiber'))];

function search(node, depth, results) {
  if (!node || depth > 200) return;
  var s = node.memoizedState;
  while (s) {
    if (s.queue && s.queue.lastRenderedState && s.queue.lastRenderedState.client) {
      var cache = s.queue.lastRenderedState.client.getQueryCache();
      cache.getAll().forEach(function(q) {
        var k = JSON.stringify(q.queryKey);
        if (k.includes('eventos') && !k.includes('atrasados') && q.state.data && Array.isArray(q.state.data)) {
          results.push({ key: k, data: q.state.data });
        }
      });
    }
    s = s.next;
  }
  if (node.child) search(node.child, depth + 1, results);
  if (node.sibling) search(node.sibling, depth + 1, results);
}

var results = [];
search(fiber, 0, results);

// Find May and June queries (keys with "2026-05" and "2026-06")
var may = results.find(r => r.key.includes('2026-05') && !r.key.includes('atrasados'));
var jun = results.find(r => r.key.includes('2026-06') && !r.key.includes('atrasados'));

// Merge and deduplicate
var all = [];
var seen = {};
(may ? may.data : []).concat(jun ? jun.data : []).forEach(function(e) {
  var key = (e.nome || '') + '|' + (e.inicio ? new Date(e.inicio).toISOString() : '');
  if (!seen[key]) { seen[key] = true; all.push(e); }
});

// Save as JSON (copy to clipboard or download)
console.log(JSON.stringify(all));
```

Save the output to `events.json`.

### Step 2: Generate HTML

```bash
node generate.js events.json > index.html
```

## Critical rules for HTML generation

- **z-index**: `.modal-overlay` MUST use `z-index: 10002` (not 1000) to stay above FullCalendar's `+more` popover (default z-index 10001).
- Use FullCalendar v6 from CDN (`https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/`)
- Portuguese locale from `https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/locales/pt-br.global.min.js`
- Color mapping: see index.html subject legend
- Completed events get className `completed-event` with CSS `opacity: 0.5`
- Event `url` field should use the `link` property from the cached data
- EventClick opens a custom modal (not FullCalendar's default popover)

## Color scheme

- "Língua Portuguesa" → #2196F3
- "Legislação Institucional do PJSC" → #4CAF50
- "Ética e Gestão no Serviço Público" → #8BC34A
- "Noções de Informática e Proteção de Dados" → #FF9800
- "Direitos Humanos e Acesso à Justiça" → #9C27B0
- "Engenharia de Software" → #E91E63
- "Arquitetura de Sistemas" → #00BCD4
- "Banco de Dados" → #3F51B5
- "Infraestrutura de TI" → #607D8B
- "Segurança da Informação" → #F44336
- "Projetos e Governança de TI" → #FF5722
- "Revisão" → #795548
- Default → #9E9E9E
