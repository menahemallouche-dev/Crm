"use client";

import { useState } from "react";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { PIPELINE_STAGE_LABELS, PipelineStage } from "@gecodis/shared";
import { apiClient } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";

const currency = (v?: number | null) =>
  v ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v) : "";

const STAGE_COLORS: Record<string, string> = {
  PROSPECT_FROID: "border-t-ink-faint",
  PREMIER_APPEL: "border-t-brand",
  RELANCE_1: "border-t-brand",
  RELANCE_2: "border-t-brand",
  RDV: "border-t-warning",
  DEVIS: "border-t-warning",
  NEGOCIATION: "border-t-warning",
  GAGNE: "border-t-success",
  PERDU: "border-t-danger",
};

interface PendingMove {
  dealId: string;
  stage: PipelineStage;
  dealTitle: string;
}

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["deals-kanban"],
    queryFn: async () => (await apiClient.get("/deals/kanban")).data,
  });

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [comment, setComment] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");

  const moveDeal = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post(`/deals/${pendingMove!.dealId}/move`, {
          stage: pendingMove!.stage,
          comment: comment || undefined,
          nextAction: nextAction || undefined,
          nextActionDate: nextActionDate || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-kanban"] });
      setPendingMove(null);
      setComment("");
      setNextAction("");
      setNextActionDate("");
    },
  });

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const sourceStage = result.source.droppableId as PipelineStage;
    const destStage = result.destination.droppableId as PipelineStage;
    if (sourceStage === destStage) return;

    const column = data?.find((c: any) => c.stage === sourceStage);
    const deal = column?.deals[result.source.index];
    if (!deal) return;

    setPendingMove({ dealId: deal.id, stage: destStage, dealTitle: deal.title });
  }

  return (
    <div>
      <PageHeader title="Pipeline commercial" description="Prospect froid → Premier appel → Relances → RDV → Devis → Négociation → Gagné/Perdu." />

      {isLoading ? (
        <p className="text-sm text-ink-faint">Chargement du pipeline…</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {data?.map((column: any) => (
              <div key={column.stage} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-semibold text-ink">{PIPELINE_STAGE_LABELS[column.stage as PipelineStage]}</h3>
                  <span className="text-xs text-ink-faint">{column.deals.length}</span>
                </div>
                <p className="text-xs text-ink-faint px-1 mb-2">{currency(column.totalValue)}</p>

                <Droppable droppableId={column.stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[120px] rounded-xl p-1.5 transition-colors border-t-2 ${STAGE_COLORS[column.stage]} ${
                        snapshot.isDraggingOver ? "bg-brand/5" : ""
                      }`}
                    >
                      {column.deals.map((deal: any, index: number) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`card p-3 cursor-grab active:cursor-grabbing ${dragSnapshot.isDragging ? "shadow-popover" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-ink leading-snug">{deal.title}</p>
                                <GripVertical size={14} className="text-ink-faint shrink-0 mt-0.5" />
                              </div>
                              <p className="text-xs text-ink-muted mt-1">{deal.company?.name}</p>
                              {deal.estimatedValue && (
                                <p className="text-xs font-medium text-brand mt-2">{currency(deal.estimatedValue)}</p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      <Modal
        open={!!pendingMove}
        onClose={() => setPendingMove(null)}
        title={`Déplacer "${pendingMove?.dealTitle}" vers ${pendingMove ? PIPELINE_STAGE_LABELS[pendingMove.stage] : ""}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            moveDeal.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-ink">Compte rendu</label>
            <textarea className="input mt-1" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Prochaine action</label>
            <input className="input mt-1" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="ex: Envoyer le devis" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Date de la prochaine relance</label>
            <input
              type="date"
              className="input mt-1"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1">Un rappel automatique sera créé pour cette date.</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={moveDeal.isPending}>
            {moveDeal.isPending ? "Enregistrement…" : "Confirmer le changement d'étape"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
