interface TeacherMetric {
  label: string;
  value: string | number;
  note?: string;
}

interface MetricCardProps {
  metric: TeacherMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className="metric-card">
      <p className="metric-card__label">{metric.label}</p>
      <p className="metric-card__value">{metric.value}</p>
      {metric.note && <p className="metric-card__note">{metric.note}</p>}
    </article>
  );
}
