// Version: LBK-20240602
import { PropsWithChildren } from 'react';
import './SectionCard.css';

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionCard({ title, description, action, children }: PropsWithChildren<SectionCardProps>) {
  return (
    <section className="section-card" aria-labelledby={`${title}-heading`}>
      <div className="section-card__header">
        <div>
          <h2 id={`${title}-heading`} className="section-card__title">
            {title}
          </h2>
          {description && <p className="section-card__description">{description}</p>}
        </div>
        {action && <div className="section-card__action">{action}</div>}
      </div>
      <div className="section-card__content">{children}</div>
    </section>
  );
}
