// Minimal, dependency-free markdown → HTML for the minutes editor preview.
// Supports headings, bold/italic, links, and lists — enough for meeting
// minutes. Input is escaped first so this is safe to render with
// dangerouslySetInnerHTML.

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listBuffer.length > 0 && listType) {
      blocks.push(`<${listType} class="list-inside ${listType === "ul" ? "list-disc" : "list-decimal"} space-y-1">${listBuffer.join("")}</${listType}>`);
    }
    listBuffer = [];
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const unordered = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);

    if (heading) {
      flushList();
      const level = heading[1].length;
      const sizeClass = level === 1 ? "text-lg font-semibold" : level === 2 ? "text-base font-semibold" : "text-sm font-semibold";
      blocks.push(`<h${level} class="${sizeClass} text-ink-900 mt-3 mb-1">${inline(heading[2])}</h${level}>`);
    } else if (unordered) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(`<li>${inline(unordered[1])}</li>`);
    } else if (ordered) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(`<li>${inline(ordered[1])}</li>`);
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(`<p class="text-sm text-ink-700 leading-relaxed">${inline(line)}</p>`);
    }
  }
  flushList();

  return blocks.join("\n") || '<p class="text-sm text-ink-400">Nothing to preview yet.</p>';
}
