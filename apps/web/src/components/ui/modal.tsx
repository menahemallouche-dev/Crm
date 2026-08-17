"use client";

import { X } from "lucide-react";
import { clsx } from "clsx";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={clsx("relative card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in", className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="btn-ghost !p-1.5">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
