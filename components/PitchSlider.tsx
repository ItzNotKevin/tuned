"use client";

interface PitchSliderProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Slider in semitone space. Semitones are already a logarithmic scale of
 * frequency, so a linear slider here matches human pitch perception.
 * Range: -12 to +12 semitones (one octave each way).
 */
export default function PitchSlider({
  value,
  onChange,
  disabled = false,
  min = -12,
  max = 12,
  step = 0.1,
}: PitchSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min} st</span>
        <span>0</span>
        <span>+{max} st</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, #d1d5db ${pct}%)` }}
      />
      <div className="text-center font-mono text-lg font-semibold">
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)} semitones
      </div>
    </div>
  );
}
