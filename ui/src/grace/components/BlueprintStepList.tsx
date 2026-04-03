/**
 * BlueprintStepList — read-only step summary panel.
 * Designed to be embeddable in Studio template mode, drawers, or preview panels.
 */

import { Zap, Wrench } from "lucide-react";
import type { BlueprintStep } from "../blueprints/blueprintTypes";
import { cn } from "@/lib/utils";

interface BlueprintStepListProps {
  steps: BlueprintStep[];
  className?: string;
}

export function BlueprintStepList({ steps, className }: BlueprintStepListProps) {
  return (
    <ol className={cn("space-y-2", className)}>
      {steps.map((step, idx) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] text-[10px] font-bold text-[var(--grace-accent)]">
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-px flex-1 bg-border/60 mt-0.5" style={{ minHeight: 12 }} />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{step.name}</span>
              {step.agentRole && (
                <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">
                  {step.agentRole}
                </span>
              )}
            </div>
            {step.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-2">
              {step.skills?.map((skill) => (
                <span
                  key={skill.id}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/80 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5"
                  title={skill.description}
                >
                  <Zap size={9} className="text-[var(--grace-accent)]/60" />
                  {skill.name}
                </span>
              ))}
              {step.tools?.map((tool) => (
                <span
                  key={tool.id}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/80 rounded border border-border/60 bg-muted/30 px-1.5 py-0.5"
                  title={tool.description}
                >
                  <Wrench size={9} className="text-muted-foreground/50" />
                  {tool.name}
                </span>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
