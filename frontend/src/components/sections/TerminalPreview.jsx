import { TERMINAL_LINES } from "../../constants";

export default function TerminalPreview() {
  return (
    <div className="font-mono text-[10px] leading-[1.8] overflow-hidden">
      {TERMINAL_LINES.map((line, i) => (
        <div
          key={i}
          className={`${line.color} ${line.bold ? "font-semibold" : ""}`}
        >
          {line.text || "\u00a0"}
        </div>
      ))}
    </div>
  );
}
