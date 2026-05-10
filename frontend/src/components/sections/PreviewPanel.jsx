import { WindowCard } from "../ui/WindowCard";
import CodeEditorPreview from "./CodeEditorPreview";
import TerminalPreview from "./TerminalPreview";
import ChartPreview from "./ChartPreview";

function PreviewLabel({ icon, label, color }) {
  return (
    <div className={`border-t border-purple-500/20 mt-3 pt-3`}>
      <p className={`text-xs font-semibold mb-1 ${color}`}>{icon} {label}</p>
    </div>
  );
}

export default function PreviewPanel() {
  return (
    <div className="hidden lg:grid grid-cols-2 grid-rows-[auto_auto] gap-4 pt-2">
      {/* Code editor - tall, spans 2 rows */}
      <WindowCard title="main.py" className="row-span-2">
        <CodeEditorPreview />
        <PreviewLabel
          icon="</>"
          label="Real-time Collaboration"
          color="text-purple-400"
        />
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
          Code together in real-time with cursor sharing, highlighting, and follow mode
        </p>
      </WindowCard>

      {/* Terminal */}
      <WindowCard title="Terminal">
        <TerminalPreview />
        <PreviewLabel icon=">_" label="Shared Terminal" color="text-yellow-400" />
        <p className="text-[11px] text-gray-500 mt-0.5">Execute code with 80+ languages</p>
      </WindowCard>

      {/* Chart */}
      <WindowCard title="Preview">
        <ChartPreview />
        <PreviewLabel icon="◈" label="Live Preview" color="text-cyan-400" />
        <p className="text-[11px] text-gray-500 mt-0.5">Preview UI with Tailwind CSS & more</p>
      </WindowCard>
    </div>
  );
}
