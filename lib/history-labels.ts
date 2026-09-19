export const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: "Topshiriq yaratildi",
  STATUS_CHANGED: "Holat o'zgartirildi",
  DEADLINE_CHANGED: "Muddat o'zgartirildi",
  ASSIGNEE_ADDED: "Ijrochi qo'shildi",
  ASSIGNEE_REMOVED: "Ijrochi olib tashlandi",
  TASK_CANCELLED: "Bekor qilindi",
};

export function historyActionLabel(action: string): string {
  return HISTORY_ACTION_LABELS[action] ?? action;
}
