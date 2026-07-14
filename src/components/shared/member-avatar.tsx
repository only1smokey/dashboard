import { UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string | null) {
  if (!name) return null;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");
}

export function MemberAvatar({
  avatarUrl,
  displayName,
  className,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  className?: string;
}) {
  const fallback = initials(displayName);

  return (
    <Avatar className={cn("size-9", className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={displayName ?? ""} />
      ) : null}
      <AvatarFallback>
        {fallback || <UserRound className="size-4" aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  );
}
