import Link from "next/link";
import type { Room } from "@/lib/types";

export function RoomListItem({ room, isActive }: { room: Room; isActive: boolean }) {
  return (
    <Link
      href={`/chat/${room.id}`}
      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <div className="font-medium">{room.name ?? "Untitled chat"}</div>
      {room.is_group && <div className="text-xs text-gray-400">Group chat</div>}
    </Link>
  );
}
