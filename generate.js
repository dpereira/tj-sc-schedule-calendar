#!/usr/bin/env node

/**
 * TJ SC Schedule Calendar Generator
 *
 * Usage:
 *   node generate.js < events.json > index.html
 *
 * Input: JSON array of events with fields:
 *   { nome, inicio, fim, concluido, link }
 *
 * The events data can be extracted from the Gran Cursos cronograma page
 * by accessing the React Query cache via window.__cronograma_app_ref.
 * See AGENTS.md for detailed extraction instructions.
 */

const fs = require('fs');
const crypto = require('crypto');

// ── Config ──────────────────────────────────────────────────────────
const CONFIG = {
  title: 'TJ SC Schedule Calendar',
  courseUrl: 'https://www.grancursosonline.com.br/aluno/cronograma/c0f66fb2-244f-4449-a5b3-73f11e8a04a3',
  fullcalendarCss: 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/main.min.css',
  fullcalendarJs: 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js',
  fullcalendarLocale: 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/locales/pt-br.global.min.js',
  firebaseUrl: 'https://tj-sc-calendar-default-rtdb.firebaseio.com',
};

const COLOR_MAP = [
  { key: 'Língua Portuguesa', color: '#2196F3' },
  { key: 'Legislação Institucional do PJSC', color: '#4CAF50' },
  { key: 'Ética e Gestão no Serviço Público', color: '#8BC34A' },
  { key: 'Noções de Informática e Proteção de Dados', color: '#FF9800' },
  { key: 'Direitos Humanos e Acesso à Justiça', color: '#9C27B0' },
  { key: 'Engenharia de Software', color: '#E91E63' },
  { key: 'Arquitetura de Sistemas', color: '#00BCD4' },
  { key: 'Banco de Dados', color: '#3F51B5' },
  { key: 'Infraestrutura de TI', color: '#607D8B' },
  { key: 'Segurança da Informação', color: '#F44336' },
  { key: 'Projetos e Governança de TI', color: '#FF5722' },
  { key: 'Revisão', color: '#795548' },
];

function getColor(nome) {
  for (const entry of COLOR_MAP) {
    if (nome && nome.startsWith(entry.key)) return entry.color;
  }
  return '#9E9E9E';
}

function getSubject(nome) {
  for (const entry of COLOR_MAP) {
    if (nome && nome.startsWith(entry.key)) return entry.key;
  }
  return 'Default';
}

function escapeJs(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function eventHash(nome, inicio) {
  return crypto.createHash('md5').update(nome + '|' + new Date(inicio).toISOString()).digest('hex').substring(0, 12);
}

// ── Generate HTML ───────────────────────────────────────────────────

function generate(events) {
  const eventItems = events.map((e, i) => {
    const start = new Date(e.inicio).toISOString();
    const end = new Date(e.fim).toISOString();
    const completed = !!e.concluido;
    const color = getColor(e.nome);
    const subject = getSubject(e.nome);
    const topic = (e.nome || '').replace(/^[^|]+\|\s*/, '');
    const link = e.link || '';
    const classNames = completed ? '["completed-event"]' : '[]';
    const eid = eventHash(e.nome, e.inicio);

    return `    {id:'${eid}',title:'${escapeJs(e.nome)}',start:'${start}',end:'${end}',backgroundColor:'${color}',borderColor:'${color}',textColor:'#fff',classNames:${classNames},url:'${escapeJs(link)}',extendedProps:{eventId:'${eid}',subject:'${escapeJs(subject)}',topic:'${escapeJs(topic)}',completed:${completed},link:'${escapeJs(link)}'}}`;
  });

  const legendItems = COLOR_MAP
    .filter(e => events.some(ev => ev.nome && ev.nome.startsWith(e.key)))
    .map(e => `<span class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.key}</span>`)
    .join(' ');

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${CONFIG.title}</title>
<link rel="stylesheet" href="${CONFIG.fullcalendarCss}">
<script src="${CONFIG.fullcalendarJs}"></script>
<script src="${CONFIG.fullcalendarLocale}"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
.header { background: #1a237e; color: #fff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 1.2rem; font-weight: 600; }
.header a { color: #ffd54f; text-decoration: none; font-size: 0.9rem; padding: 6px 16px; border: 1px solid #ffd54f; border-radius: 4px; transition: background 0.2s; }
.header a:hover { background: rgba(255, 213, 79, 0.15); }
.legend { padding: 12px 24px; background: #fff; border-bottom: 1px solid #e0e0e0; display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 0.78rem; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
#calendar { max-width: 1400px; margin: 16px auto; padding: 0 16px; }
.completed-event { opacity: 0.5; }
.modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10002; justify-content: center; align-items: center; }
.modal-overlay.active { display: flex; }
.modal { background: #fff; border-radius: 8px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.modal h2 { font-size: 1.1rem; margin-bottom: 12px; color: #1a237e; }
.modal p { margin: 6px 0; font-size: 0.9rem; line-height: 1.4; }
.modal .label { color: #666; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
.modal .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
.modal .status-badge.completed { background: #c8e6c9; color: #2e7d32; }
.modal .status-badge.pending { background: #ffecb3; color: #f57f17; }
.modal .modal-link { display: inline-block; margin-top: 8px; padding: 8px 16px; background: #1a237e; color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.9rem; }
.modal .modal-link:hover { background: #283593; }
.modal-close { margin-top: 12px; padding: 8px 20px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-left: 8px; }
.modal-close:hover { background: #555; }
.modal-toggle { margin-top: 8px; padding: 8px 16px; background: #ff8f00; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
.modal-toggle:hover { background: #ff6f00; }
.modal-toggle.completed { background: #2e7d32; }
.modal-toggle.completed:hover { background: #1b5e20; }
.modal-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
</style>
</head>
<body>

<div class="header">
  <h1>📚 TJ SC — Cronograma de Estudos</h1>
  <a href="${CONFIG.courseUrl}" target="_blank">Acessar Gran Cursos</a>
</div>

<div class="legend">${legendItems}</div>

<div id="calendar"></div>

<div class="modal-overlay" id="modal">
  <div class="modal">
    <h2 id="modal-title"></h2>
    <p><span class="label">Disciplina</span><br><span id="modal-subject"></span></p>
    <p><span class="label">Tópico</span><br><span id="modal-topic"></span></p>
    <p><span class="label">Data</span><br><span id="modal-date"></span></p>
    <p><span class="label">Horário</span><br><span id="modal-time"></span></p>
    <p><span class="label">Status</span><br><span id="modal-status"></span></p>
    <div class="modal-actions">
      <a class="modal-link" id="modal-link" target="_blank">Abrir aula</a>
      <button class="modal-toggle" id="modal-toggle" onclick="toggleCurrentCompletion()">✓ Marcar concluída</button>
      <button class="modal-close" onclick="closeModal()">Fechar</button>
    </div>
  </div>
</div>

<script>
const FIREBASE_URL = '${CONFIG.firebaseUrl}';
const events = [
${eventItems.join(',\n')}
];

let calendar = null;
let currentModalEventId = null;

async function loadCompletions() {
  try {
    const res = await fetch(FIREBASE_URL + '/completions.json');
    const completions = await res.json();
    if (!completions) return;
    for (const event of events) {
      const eid = event.extendedProps.eventId || event.id;
      if (eid && completions[eid] !== undefined) {
        event.extendedProps.completed = completions[eid];
        event.classNames = completions[eid] ? ['completed-event'] : [];
      }
    }
    const calEvents = calendar.getEvents();
    for (const ce of calEvents) {
      const eid = ce.extendedProps.eventId || ce.id;
      if (eid && completions[eid] !== undefined) {
        ce.setExtendedProp('completed', completions[eid]);
        ce.setProp('classNames', completions[eid] ? ['completed-event'] : []);
      }
    }
    if (currentModalEventId) {
      const modalEvent = calendar.getEventById(currentModalEventId);
      if (modalEvent) updateModal(modalEvent);
    }
  } catch (e) {
    console.warn('Falha ao carregar conclusões:', e);
  }
}

async function toggleCompletion(eventId, currentState) {
  const newState = !currentState;
  try {
    await fetch(FIREBASE_URL + '/completions/' + eventId + '.json', {
      method: 'PUT',
      body: JSON.stringify(newState),
      headers: { 'Content-Type': 'application/json' }
    });
    const ce = calendar.getEventById(eventId);
    if (ce) {
      ce.setExtendedProp('completed', newState);
      ce.setProp('classNames', newState ? ['completed-event'] : []);
    }
    const localEvent = events.find(e => (e.extendedProps.eventId || e.id) === eventId);
    if (localEvent) {
      localEvent.extendedProps.completed = newState;
      localEvent.classNames = newState ? ['completed-event'] : [];
    }
    if (currentModalEventId === eventId) {
      const modalEvent = calendar.getEventById(eventId);
      if (modalEvent) updateModal(modalEvent);
    }
  } catch (e) {
    console.warn('Falha ao salvar conclusão:', e);
  }
}

function toggleCurrentCompletion() {
  if (!currentModalEventId) return;
  const ce = calendar.getEventById(currentModalEventId);
  if (!ce) return;
  toggleCompletion(currentModalEventId, ce.extendedProps.completed);
}

function updateModal(e) {
  const p = e.extendedProps;
  const start = e.start;
  const end = e.end;

  document.getElementById('modal-title').textContent = e.title;
  document.getElementById('modal-subject').textContent = p.subject || '';
  document.getElementById('modal-topic').textContent = p.topic || '';
  document.getElementById('modal-date').textContent = start
    ? start.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  document.getElementById('modal-time').textContent =
    (start ? start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')
    + ' - ' +
    (end ? end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  const statusEl = document.getElementById('modal-status');
  if (p.completed) {
    statusEl.innerHTML = '<span class="status-badge completed">✔ Concluído</span>';
  } else {
    statusEl.innerHTML = '<span class="status-badge pending">⏳ Pendente</span>';
  }
  const linkEl = document.getElementById('modal-link');
  if (p.link) {
    linkEl.href = p.link;
    linkEl.style.display = 'inline-block';
  } else {
    linkEl.style.display = 'none';
  }
  const toggleEl = document.getElementById('modal-toggle');
  if (p.completed) {
    toggleEl.textContent = '↩ Desmarcar';
    toggleEl.className = 'modal-toggle completed';
  } else {
    toggleEl.textContent = '✓ Marcar concluída';
    toggleEl.className = 'modal-toggle';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    firstDay: 0,
    slotMinTime: '06:00:00',
    slotMaxTime: '22:00:00',
    dayMaxEvents: true,
    nowIndicator: true,
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia'
    },
    events: events,
    eventClick: function(info) {
      info.jsEvent.preventDefault();
      currentModalEventId = info.event.id || info.event.extendedProps.eventId;
      updateModal(info.event);
      document.getElementById('modal').classList.add('active');
    }
  });
  calendar.render();
  loadCompletions();
});

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});
</script>
</body>
</html>`;
}

// ── Main ────────────────────────────────────────────────────────────

let input = '';
if (process.argv[2]) {
  input = fs.readFileSync(process.argv[2], 'utf-8');
} else {
  input = fs.readFileSync('/dev/stdin', 'utf-8');
}

let events;
try {
  events = JSON.parse(input);
} catch {
  console.error('Error: Input must be a valid JSON array of events.');
  process.exit(1);
}

if (!Array.isArray(events)) {
  console.error('Error: Input must be a JSON array.');
  process.exit(1);
}

console.log(generate(events));
