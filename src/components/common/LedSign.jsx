import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Sparkles, BadgeDollarSign } from "lucide-react";

/**
 * Goldmarket LED Sign
 * - Neon border + LED tick marks
 * - Cycles through messages/icons like a storefront LED panel
 * - Two visual modes: "subtle" (default) and "flashy"
 *
 * Usage:
 * <LedSign className="w-full max-w-sm" mode="flashy" interval={2800}
 *          messages={["Money", "Exchange", "Welcome", "ABC 현지 상품권"]} />
 */
export default function LedSign({
  className = "",
  mode = "subtle", // "subtle" | "flashy"
  interval = 2600,
  messages = ["Money", "Exchange", "Welcome", "ABC 현지 상품권"],
}) {
  const [index, setIndex] = useState(0);

  const palette = useMemo(
    () => ({
      red: "#ff3b3b",
      blue: "#3bf0ff",
      violet: "#d487ff",
      lime: "#a8ff60",
      amber: "#ffd166",
    }),
    []
  );

  // Build a sequence mixing icons + text like a real LED sign
  const sequence = useMemo(() => {
    return [
      { key: "money", type: "icon", Icon: DollarSign, color: palette.red, label: "Money" },
      { key: "ring", type: "icon", Icon: BadgeDollarSign, color: palette.violet, label: "Exchange" },
      { key: "spark", type: "icon", Icon: Sparkles, color: palette.lime, label: "Welcome" },
      ...messages.map((m, i) => ({ key: `msg-${i}`, type: "text", text: m })),
    ];
  }, [messages, palette]);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sequence.length);
    }, interval);
    return () => clearInterval(id);
  }, [interval, sequence.length]);

  const current = sequence[index % sequence.length];

  return (
    <div
      className={[
        "relative rounded-3xl p-0.5",
        "[filter:drop-shadow(0_0_10px_rgba(0,255,255,.45))]",
        mode === "flashy"
          ? "bg-[conic-gradient(from_0deg,rgba(0,255,255,.6),rgba(255,0,153,.6),rgba(0,255,153,.6),rgba(0,136,255,.6),rgba(0,255,255,.6))] animate-[spin_6s_linear_infinite]"
          : "bg-[radial-gradient(circle_at_50%_0,rgba(0,255,255,.35),rgba(0,0,0,0))]",
        className,
      ].join(" ")}
      style={{ borderRadius: 28 }}
    >
      {/* Inner panel */}
      <div className="relative rounded-[26px] bg-zinc-950 px-6 py-10 overflow-hidden">
        {/* LED border ticks */}
        <LedTicks flashy={mode === "flashy"} />

        {/* Center content */}
        <div className="relative z-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {current.type === "text" ? (
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.45 }}
                className="text-center"
              >
                <NeonText text={current.text} mode={mode} />
              </motion.div>
            ) : (
              <motion.div
                key={current.key}
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.75, opacity: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
                className="flex flex-col items-center gap-3"
              >
                <current.Icon
                  className="h-20 w-20 drop-shadow-[0_0_18px_rgba(255,255,255,.45)]"
                  style={{ color: current.color }}
                />
                <NeonText text={current.label} mode={mode} small />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[26px] opacity-20 mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient( to bottom, rgba(255,255,255,.06) 0, rgba(255,255,255,.06) 1px, transparent 1px, transparent 3px )",
          }}
        />
      </div>
    </div>
  );
}

function NeonText({ text, mode, small = false }) {
  const base = small ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl lg:text-6xl";
  const glow =
    mode === "flashy"
      ? "[text-shadow:0_0_6px_rgba(255,0,153,.8),0_0_22px_rgba(0,255,255,.8),0_0_42px_rgba(0,255,170,.8)]"
      : "[text-shadow:0_0_10px_rgba(0,255,255,.6)]";
  return (
    <span
      className={[
        base,
        glow,
        "font-extrabold tracking-wide select-none",
        "bg-clip-text text-transparent",
        "bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-300",
        "animate-pulse",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function LedTicks({ flashy }) {
  // LED tick ring & corner runners
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px]">
      {/* Corner runners */}
      <motion.div
        className="absolute inset-[8px] rounded-[20px]"
        style={{
          boxShadow: flashy
            ? "0 0 24px 6px rgba(0,255,255,.6) inset"
            : "0 0 18px 3px rgba(0,255,255,.35) inset",
        }}
        animate={{ opacity: [0.8, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      {/* Tick marks */}
      <div className="absolute inset-[10px] rounded-[18px] grid grid-cols-12 grid-rows-6">
        {Array.from({ length: 72 }).map((_, i) => (
          <motion.div
            key={i}
            className="[filter:drop-shadow(0_0_6px_rgba(0,255,255,.8))]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, delay: i * 0.02, repeat: Infinity }}
            style={{
              background: i % 3 === 0 ? "#3bf0ff" : i % 3 === 1 ? "#d487ff" : "#a8ff60",
              borderRadius: 2,
              margin: 2,
              height: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
