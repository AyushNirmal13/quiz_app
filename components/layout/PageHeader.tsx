import type { ReactNode } from "react";

import type { HeaderStat } from "@/types/quiz";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  stats?: HeaderStat[];
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, stats = [], action }: PageHeaderProps) {
  return (
    <section className="page-intro">
      <div className="page-intro__top">
        <div className="page-intro__copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-lede">{description}</p>
        </div>

        {action ? <div className="page-intro__action">{action}</div> : null}
      </div>

      {stats.length > 0 ? (
        <dl className="kpi-strip">
          {stats.map((stat) => (
            <div key={stat.label} className="kpi-item">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
