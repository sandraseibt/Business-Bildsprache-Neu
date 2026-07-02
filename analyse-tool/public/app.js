const form = document.getElementById('analyze-form');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
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
  resultEl.hidden = true;
  resultEl.innerHTML = '';
  submitBtn.disabled = true;
  setStatus('Analyse läuft … Website wird geladen und Screenshots werden ausgewertet (kann bis zu ~1 Minute dauern).');

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
    resultEl.innerHTML = renderMarkdown(data.analysis || '');
    resultEl.hidden = false;
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});
