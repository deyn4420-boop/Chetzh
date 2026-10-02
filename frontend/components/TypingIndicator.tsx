export function TypingIndicator({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-400">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" />
      </span>
      <span>{count === 1 ? "Someone is typing…" : `${count} people are typing…`}</span>
    </div>
  );
}
