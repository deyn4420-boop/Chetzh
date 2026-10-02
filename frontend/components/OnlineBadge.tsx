export function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-300"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
