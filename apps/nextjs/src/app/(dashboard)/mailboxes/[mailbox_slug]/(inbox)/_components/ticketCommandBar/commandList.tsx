import { CommandGroup as CmdGroup, CommandList as CmdList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CommandGroup } from "./types";

type CommandListProps = {
  isLoading: boolean;
  page: "main" | "previous-replies" | "assignees" | "notes" | "tools";
  groups: CommandGroup[];
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  onMouseEnter: (id: string | null) => void;
};

export const CommandList = ({ isLoading, page, groups, selectedItemId, onSelect, onMouseEnter }: CommandListProps) => {
  if (isLoading && page === "previous-replies") {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 pointer-events-none">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        <p className="text-sm text-muted-foreground">Finding similar replies...</p>
      </div>
    );
  }

  return (
    <CmdList className="max-h-none h-full overflow-y-auto">
      <CommandEmpty>No results found.</CommandEmpty>
      {groups.map((group) => (
        <CmdGroup key={group.heading} heading={group.heading}>
          {group.items
            .filter((item) => !item.hidden)
            .map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => onSelect(item.id)}
                onMouseEnter={() => onMouseEnter(item.id)}
                className={cn("flex items-center gap-2 cursor-pointer")}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.shortcut && (
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    {item.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
        </CmdGroup>
      ))}
    </CmdList>
  );
};
