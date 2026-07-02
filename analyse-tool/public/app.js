const form = document.getElementById('analyze-form');
const statusEl = document.getElementById('status');
const result1El = document.getElementById('result-1');
const result2El = document.getElementById('result-2');
const submitBtn = document.getElementById('submit-btn');

function setStatus(message, isError) {
  statusEl.hidden = !message;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', Boolean(isError));
}

// Minimal Markdown -> HTML (Überschriften, Fett, Listen, Absätze). Kein externes Paket nötig.
function renderMarkdown(text) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  function closeList() {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  }

  function inline(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '⸻') {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const numberedHeading = line.match(/^(\d+)\.\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
    } else if (numberedHeading) {
      closeList();
      html += `<h2>${inline(line)}</h2>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`;
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result1El.hidden = true;
  result2El.hidden = true;
  result1El.innerHTML = '';
  result2El.innerHTML = '';
  submitBtn.disabled = true;
  setStatus('Analyse läuft … Website wird geladen, Screenshots werden erstellt/ausgewertet und beide Analysen nacheinander erzeugt (kann 1–2 Minuten dauern).');

  const formData = new FormData(form);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Fehler (${response.status})`);
    }

    setStatus('');
    result1El.innerHTML = `<h2 class="result-title">${data.analysis1Titel || 'Analyse 1'}</h2>` + renderMarkdown(data.analysis1 || '');
    result2El.innerHTML = `<h2 class="result-title">${data.analysis2Titel || 'Analyse 2'}</h2>` + renderMarkdown(data.analysis2 || '');
    result1El.hidden = false;
    result2El.hidden = false;
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});
