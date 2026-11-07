import React from 'react';

// Dependency-free, SAFE formatting for the Markdown returned by SkillCredit AI.
// It intentionally does not execute/interpret HTML, embeds or javascript: links.
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|(?<!\w)_[^_\n]+_(?!\w)|\[[^\]]{1,140}\]\([^\s)]+\))/g;

function inline(source) {
  return String(source).split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-800 font-mono text-[0.89em] break-all">{part.slice(1, -1)}</code>;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__')))
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
      return <em key={i}>{part.slice(1, -1)}</em>;
    const matched = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part);
    if (matched) {
      const href = matched[2];
      // Only safe HTTPS or local app links; never support javascript:, data: or protocol-relative URLs.
      if (/^https:\/\/[^\s]+$/i.test(href)) return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900">{matched[1]}</a>;
      if (/^\/(?!\/)[a-zA-Z0-9/?#=&_%-]*$/.test(href)) return <a key={i} href={href} className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900">{matched[1]}</a>;
      return <span key={i}>{matched[1]}</span>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function tableCells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}
function isDivider(line) {
  const cells = tableCells(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
function isTableStart(lines, i) {
  return i + 1 < lines.length && lines[i].includes('|') && lines[i + 1].includes('|') && isDivider(lines[i + 1]);
}
function isSpecial(lines, i) {
  const s = lines[i] || '';
  return /^\s*```/.test(s) || /^\s*#{1,5}\s/.test(s) || /^\s*([-*+]\s|\d+\.\s)/.test(s) || /^\s*>/.test(s) || /^\s*(?:---+|___+|\*\*\*+)\s*$/.test(s) || isTableStart(lines, i);
}

export default function AIMessageMarkdown({ text }) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^\s*```([^`]*)\s*$/.exec(line);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push(<div key={key++} className="my-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-slate-50"><pre className="text-xs leading-5 font-mono whitespace-pre">{code.join('\n')}</pre></div>);
      continue;
    }
    const heading = /^\s*(#{1,5})\s+(.+)$/.exec(line);
    if (heading) {
      const cls = heading[1].length <= 2 ? 'text-[15px] sm:text-base font-bold' : 'text-[13px] sm:text-sm font-semibold';
      blocks.push(<h3 key={key++} className={`${cls} text-slate-900 mt-3 mb-1.5 leading-snug`}>{inline(heading[2])}</h3>);
      i++;
      continue;
    }
    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="border-slate-200 my-3" />);
      i++;
      continue;
    }
    if (isTableStart(lines, i)) {
      const heads = tableCells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(tableCells(lines[i++]));
      blocks.push(<div key={key++} className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full w-max text-left text-[12px] leading-5 border-collapse">
          <thead className="bg-emerald-50 text-emerald-900"><tr>{heads.map((h, c) => <th key={c} className="px-3 py-2 font-semibold border-b border-slate-200 whitespace-nowrap">{inline(h)}</th>)}</tr></thead>
          <tbody>{rows.map((row, r) => <tr key={r} className="odd:bg-white even:bg-slate-50/70">{heads.map((_, c) => <td key={c} className="px-3 py-2 border-b border-slate-100 align-top min-w-24 max-w-64 whitespace-normal">{inline(row[c] || '')}</td>)}</tr>)}</tbody>
        </table>
      </div>);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key++} className="my-2 border-l-[3px] border-emerald-400 bg-emerald-50/70 px-3 py-2 rounded-r-lg italic text-slate-700">{inline(quote.join(' '))}</blockquote>);
      continue;
    }
    const listMatch = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items = [];
      while (i < lines.length) {
        const found = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(lines[i]);
        if (!found || /^\d/.test(found[1]) !== ordered) break;
        items.push(found[2]); i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(<List key={key++} className={`my-2 pl-5 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-emerald-600`}>{items.map((item, n) => <li className="pl-1" key={n}>{inline(item)}</li>)}</List>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !isSpecial(lines, i)) para.push(lines[i++]);
    if (!para.length) { i++; continue; }
    blocks.push(<p key={key++} className="my-2 first:mt-0 last:mb-0 leading-[1.75]">{inline(para.join(' ').trim())}</p>);
  }
  return <div className="min-w-0 max-w-full break-words text-[13px] sm:text-[13.5px] text-slate-700">{blocks}</div>;
}
