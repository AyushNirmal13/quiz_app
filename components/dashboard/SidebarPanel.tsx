import Link from "next/link";

import type { ActiveSession } from "@/types/quiz";

interface SidebarPanelProps {
  session: ActiveSession;
}

export function SidebarPanel({ session }: SidebarPanelProps) {
  return (
    <aside className="sidebar-panel">
      <div className="sidebar-panel__header">
        <p className="sidebar-panel__label">{session.label}</p>
        <h2 className="sidebar-panel__title">{session.title}</h2>
        <p className="sidebar-panel__id">{session.quizId}</p>
      </div>

      <div className="progress-block">
        <progress className="progress-track" value={session.progress} max={100}>
          {session.progress}%
        </progress>
        <div className="progress-copy">
          <span>{session.progress}% complete</span>
          <span>
            {session.answered}/{session.totalQuestions}
          </span>
        </div>
      </div>

      <dl className="detail-list">
        <div className="detail-list__row">
          <dt>Time left</dt>
          <dd>{session.timeLeft}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Security</dt>
          <dd>{session.securityMode}</dd>
        </div>
        <div className="detail-list__row">
          <dt>Checkpoint</dt>
          <dd>{session.checkpoint}</dd>
        </div>
      </dl>

      <Link href={`/quiz/${session.slug}`} className="btn-primary">
        Continue
      </Link>
    </aside>
  );
}
