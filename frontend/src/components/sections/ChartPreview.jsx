import { SALES_BARS } from "../../constants";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export default function ChartPreview() {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-2">Monthly Sales</p>
      <div className="flex items-end gap-1.5 h-16">
        {SALES_BARS.map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full bg-gradient-to-t ${bar.color} rounded-t`}
              style={{ height: bar.height }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {MONTHS.map((m) => (
          <span key={m} className="text-[9px] text-gray-600 flex-1 text-center">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
