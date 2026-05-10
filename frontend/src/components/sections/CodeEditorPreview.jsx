import { CODE_LINES } from "../../constants";
import { CursorChip } from "../ui/Badge";

function renderCodeLine(line) {
  if (line.type === "blank") return <span>&nbsp;</span>;

  const text = line.text;
  let rendered;

  if (line.type === "keyword" || line.type === "def") {
    const kwMatch = text.match(/^(class|def)\s+(\w+)(.*)/);
    if (kwMatch) {
      rendered = (
        <>
          <span className="text-purple-400">{kwMatch[1]} </span>
          <span className="text-blue-400">{kwMatch[2]}</span>
          <span className="text-purple-100/80">{kwMatch[3]}</span>
        </>
      );
    } else {
      rendered = <span className="text-purple-100/80">{text}</span>;
    }
  } else {
    // Colorise strings and numbers inline
    const parts = text.split(/(\"[^\"]*\"|\b\d+\b|print|for|in|range)/g);
    rendered = parts.map((part, i) => {
      if (/^\"/.test(part)) return <span key={i} className="text-green-400">{part}</span>;
      if (/^\d+$/.test(part)) return <span key={i} className="text-green-400">{part}</span>;
      if (part === "print" || part === "range") return <span key={i} className="text-blue-400">{part}</span>;
      if (part === "for" || part === "in") return <span key={i} className="text-purple-400">{part}</span>;
      return <span key={i} className="text-purple-100/80">{part}</span>;
    });
  }

  return (
    <span>
      {rendered}
      {line.chip && <CursorChip label={line.chip.label} color={line.chip.color} />}
    </span>
  );
}

export default function CodeEditorPreview() {
  return (
    <div className="font-mono text-[11px] leading-[1.75] overflow-hidden">
      {CODE_LINES.map((line, i) => (
        <div key={i}>{renderCodeLine(line)}</div>
      ))}
    </div>
  );
}
