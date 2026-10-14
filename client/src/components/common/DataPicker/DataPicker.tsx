import "./DataPicker.css";

interface DatePickerProps {
  dates:    Date[];
  selected: number;
  onChange: (index: number) => void;
}

export default function DatePicker({ dates, selected, onChange }: DatePickerProps) {
  return (
    <div className="dp-row">
      {dates.map((d, i) => (
        <button
          key={i}
          className={`dp-btn ${selected === i ? "active" : ""}`}
          onClick={() => onChange(i)}
        >
          <span className="dp-day">
            {d.toLocaleDateString("en-IN", { weekday: "short" })}
          </span>
          <span className="dp-num">{d.getDate()}</span>
          <span className="dp-mon">
            {d.toLocaleDateString("en-IN", { month: "short" })}
          </span>
        </button>
      ))}
    </div>
  );
}