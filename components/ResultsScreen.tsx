"use client";

import type { Round } from "@/types/game";

interface ResultsScreenProps {
  rounds: Round[];
  onRestart: () => void;
}

export default function ResultsScreen({ rounds, onRestart }: ResultsScreenProps) {
  const total = rounds.reduce((sum, r) => sum + r.score, 0);
  const maxScore = rounds.length * 10;

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-center">
        Final Score: {total} / {maxScore}
      </h2>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">Song</th>
            <th className="py-2 pr-4 text-right">Applied</th>
            <th className="py-2 pr-4 text-right">Correct ans.</th>
            <th className="py-2 pr-4 text-right">Your guess</th>
            <th className="py-2 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => {
            const errorCents = Math.abs(r.targetCorrection - r.playerCorrection) * 100;
            return (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-4 truncate max-w-[10rem]">
                  <div className="font-medium">{r.track.name}</div>
                  <div className="text-gray-500 text-xs">{r.track.artist}</div>
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {r.appliedShift >= 0 ? "+" : ""}
                  {r.appliedShift.toFixed(2)} st
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {r.targetCorrection >= 0 ? "+" : ""}
                  {r.targetCorrection.toFixed(2)} st
                </td>
                <td className="py-2 pr-4 text-right font-mono">
                  {r.playerCorrection >= 0 ? "+" : ""}
                  {r.playerCorrection.toFixed(2)} st
                  <div className="text-xs text-gray-400">
                    ({errorCents.toFixed(0)} ¢ off)
                  </div>
                </td>
                <td className="py-2 text-right font-bold">{r.score}/10</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        onClick={onRestart}
        className="mx-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Play Again
      </button>
    </div>
  );
}
