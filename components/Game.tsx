"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase, GameState, Round, Track } from "@/types/game";
import { randomShift, scoreRound } from "@/lib/scoring";
import PitchSlider from "./PitchSlider";
import ResultsScreen from "./ResultsScreen";

const TOTAL_ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const INITIAL_STATE: GameState = {
  phase: "START",
  rounds: [],
  currentRound: 0,
  tracks: [],
  sliderValue: 0,
  error: null,
};

export default function Game() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const playerRef = useRef<import("tone").Player | null>(null);
  const pitchShiftRef = useRef<import("tone").PitchShift | null>(null);
  const appliedShiftRef = useRef<number>(0);

  const initTone = useCallback(async () => {
    if (playerRef.current) return; // already initialized
    const Tone = await import("tone");
    await Tone.start();
    const pitchShift = new Tone.PitchShift().toDestination();
    const player = new Tone.Player({ loop: true, fadeOut: 0.05 }).connect(pitchShift);
    pitchShiftRef.current = pitchShift;
    playerRef.current = player;
  }, []);

  const stopAudio = useCallback(() => {
    playerRef.current?.stop();
  }, []);

  // Load and start looping a clip with the given shift applied
  const startLoop = useCallback(async (track: Track, shift: number) => {
    const player = playerRef.current;
    const pitchShift = pitchShiftRef.current;
    if (!player || !pitchShift) return;

    pitchShift.pitch = shift; // slider starts at 0, so net = appliedShift
    const proxyUrl = `/api/spotify/preview?url=${encodeURIComponent(track.previewUrl)}`;
    await player.load(proxyUrl);

    // Start from a random offset in the first 20s so the loop intro varies
    const maxOffset = Math.max(0, Math.min((player.buffer.duration ?? 30) - 10, 20));
    const offset = Math.random() * maxOffset;
    player.start(undefined, offset);
  }, []);

  // ── State machine ─────────────────────────────────────────────────────────

  const startGame = useCallback(async () => {
    setState((s) => ({ ...s, phase: "LOADING", error: null }));
    await initTone();

    let tracks: Track[] = [];
    try {
      const res = await fetch("/api/spotify/tracks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tracks");
      tracks = data.tracks as Track[];
    } catch (err) {
      setState((s) => ({
        ...s,
        phase: "START",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
      return;
    }

    if (tracks.length < TOTAL_ROUNDS) {
      setState((s) => ({
        ...s,
        phase: "START",
        error: `Not enough tracks with previews (got ${tracks.length}, need ${TOTAL_ROUNDS})`,
      }));
      return;
    }

    const selected = shuffle(tracks).slice(0, TOTAL_ROUNDS);
    setState((s) => ({
      ...s,
      phase: "PLAYING",
      tracks: selected,
      rounds: [],
      currentRound: 0,
      sliderValue: 0,
    }));
  }, [initTone]);

  // Start the loop whenever we enter PLAYING for a new round
  useEffect(() => {
    if (state.phase !== "PLAYING") return;
    const track = state.tracks[state.currentRound];
    if (!track) return;

    const shift = randomShift(1.5, 6);
    appliedShiftRef.current = shift;

    startLoop(track, shift);

    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentRound]);

  // Live pitch update: net pitch = appliedShift + correction
  const handleSliderChange = useCallback((value: number) => {
    setState((s) => ({ ...s, sliderValue: value }));
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = appliedShiftRef.current + value;
    }
  }, []);

  const guess = useCallback(() => {
    if (state.phase !== "PLAYING") return;
    stopAudio();

    const appliedShift = appliedShiftRef.current;
    const targetCorrection = -appliedShift;
    const playerCorrection = state.sliderValue;
    const score = scoreRound(targetCorrection, playerCorrection);
    const track = state.tracks[state.currentRound];

    const round: Round = {
      track,
      appliedShift,
      targetCorrection,
      playerCorrection,
      score,
    };

    setState((s) => ({ ...s, phase: "RESULT", rounds: [...s.rounds, round] }));
  }, [state, stopAudio]);

  const nextRound = useCallback(() => {
    setState((s) => {
      const next = s.currentRound + 1;
      if (next >= TOTAL_ROUNDS) return { ...s, phase: "GAME_OVER" };
      return { ...s, phase: "PLAYING", currentRound: next, sliderValue: 0 };
    });
  }, []);

  const restart = useCallback(() => {
    stopAudio();
    setState(INITIAL_STATE);
  }, [stopAudio]);

  // ── Render ────────────────────────────────────────────────────────────────

  const { phase, currentRound, rounds, sliderValue, error } = state;
  const currentTrack = state.tracks[currentRound];
  const lastRound = rounds[rounds.length - 1];
  const totalScore = rounds.reduce((s, r) => s + r.score, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl flex flex-col gap-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Tuned</h1>
          <p className="text-gray-400 text-sm mt-1">
            Correct the pitch back to the original.
          </p>
        </header>

        {phase === "START" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-300 text-center max-w-sm">
              A song plays pitch-shifted. Use the slider to correct it back to
              the original key — you&apos;ll hear the change in real time. Lock in
              your answer when it sounds right.
            </p>
            {error && (
              <p className="text-red-400 text-sm bg-red-950 px-4 py-2 rounded">
                {error}
              </p>
            )}
            <button
              onClick={startGame}
              className="px-10 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition-colors"
            >
              Start Game
            </button>
          </div>
        )}

        {phase === "LOADING" && (
          <p className="text-center text-gray-400 animate-pulse">
            Loading tracks…
          </p>
        )}

        {phase === "PLAYING" && currentTrack && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Round {currentRound + 1} / {TOTAL_ROUNDS}</span>
              <span>Score: {totalScore} / {rounds.length * 10}</span>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🎵</div>
              <p className="font-semibold text-lg">{currentTrack.name}</p>
              <p className="text-gray-400 text-sm">{currentTrack.artist}</p>
              <p className="text-blue-400 text-sm mt-3">
                Move the slider until the pitch sounds correct
              </p>
            </div>

            <PitchSlider value={sliderValue} onChange={handleSliderChange} />

            <button
              onClick={guess}
              className="w-full py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition-colors"
            >
              Guess
            </button>
          </div>
        )}

        {phase === "RESULT" && lastRound && (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 rounded-xl p-6 flex flex-col gap-3">
              <h3 className="font-semibold text-lg">
                {lastRound.track.name}{" "}
                <span className="text-gray-400 text-sm font-normal">
                  — {lastRound.track.artist}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Applied shift</p>
                  <p className="font-mono text-base">
                    {lastRound.appliedShift >= 0 ? "+" : ""}
                    {lastRound.appliedShift.toFixed(2)} st
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Correct answer</p>
                  <p className="font-mono text-base">
                    {lastRound.targetCorrection >= 0 ? "+" : ""}
                    {lastRound.targetCorrection.toFixed(2)} st
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Your guess</p>
                  <p className="font-mono text-base">
                    {lastRound.playerCorrection >= 0 ? "+" : ""}
                    {lastRound.playerCorrection.toFixed(2)} st
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Error</p>
                  <p className="font-mono text-base">
                    {(Math.abs(lastRound.targetCorrection - lastRound.playerCorrection) * 100).toFixed(0)} cents
                  </p>
                </div>
              </div>
              <div className="text-center text-3xl font-bold mt-2">
                {lastRound.score} / 10
              </div>
            </div>

            <button
              onClick={nextRound}
              className="w-full py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-500 transition-colors"
            >
              {currentRound + 1 < TOTAL_ROUNDS ? "Next Round →" : "See Results"}
            </button>
          </div>
        )}

        {phase === "GAME_OVER" && (
          <ResultsScreen rounds={rounds} onRestart={restart} />
        )}
      </div>
    </div>
  );
}
