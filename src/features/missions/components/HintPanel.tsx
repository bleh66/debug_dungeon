import { useState } from "react";

export function HintPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [hintPrompt, setHintPrompt] = useState("");

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border border-[rgba(58,155,141,0.45)] bg-[rgba(58,155,141,0.15)] px-4 py-2 pixel-font text-[0.58rem] uppercase tracking-[0.16em] text-[color:var(--primary)] transition hover:bg-[rgba(58,155,141,0.22)]"
      >
        {isOpen ? "Hide Hint" : "💡 Need a Hint?"}
      </button>

      {isOpen && (
        <div className="mt-4 border border-[rgba(253,254,194,0.12)] bg-[color:var(--panel)] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.25)]">

          <textarea
            value={hintPrompt}
            onChange={(e) => setHintPrompt(e.target.value)}
            placeholder="Explain this concept or give me a hint..."
            className="min-h-32 w-full resize-y border border-[rgba(253,254,194,0.12)] bg-[rgba(0,0,0,0.14)] px-4 py-3 text-[0.92rem] text-[color:var(--text)] outline-none placeholder:text-[rgba(253,254,194,0.5)] focus:border-[rgba(58,155,141,0.52)]"
          />

          <button
            type="button"
            className="mt-4 w-full cursor-not-allowed border border-[rgba(253,254,194,0.14)] bg-[rgba(0,0,0,0.1)] px-4 py-3 pixel-font text-[0.62rem] uppercase tracking-[0.16em] text-[rgba(253,254,194,0.45)]"
          >
            Ask AI
          </button>

        </div>
      )}
    </div>
  );
}