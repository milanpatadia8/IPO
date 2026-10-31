import React from 'react';
import { IPOStatus, AnnouncementStatus, IPOCategory } from '../types/ipo';

interface StatusIndicatorProps {
  status: IPOStatus;
  announcementStatus?: AnnouncementStatus;
  category?: IPOCategory;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  announcementStatus,
  category,
}) => {
  let statusText = '';
  let statusColor = 'text-slate-600';

  switch (status) {
    case 'ongoing':
      statusText = 'Open for Bidding';
      statusColor = 'text-emerald-700 font-semibold';
      break;
    case 'upcoming':
      if (announcementStatus === 'dates_announced') {
        statusText = 'Dates Announced';
        statusColor = 'text-sky-700 font-medium';
      } else if (announcementStatus === 'expected') {
        statusText = 'Expected Issue';
        statusColor = 'text-amber-700 font-medium';
      } else {
        statusText = 'Upcoming Issue';
        statusColor = 'text-sky-700 font-medium';
      }
      break;
    case 'listed':
      statusText = 'Listed on Exchange';
      statusColor = 'text-slate-700 font-medium';
      break;
    case 'closed':
      statusText = 'Bidding Closed';
      statusColor = 'text-slate-500 font-medium';
      break;
    case 'postponed':
      statusText = 'Issue Postponed';
      statusColor = 'text-rose-700 font-medium';
      break;
    case 'withdrawn':
      statusText = 'Withdrawn';
      statusColor = 'text-rose-800 font-medium';
      break;
    default:
      statusText = status;
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      {category && (
        <>
          <span className="font-semibold text-slate-800 tracking-tight">{category}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
        </>
      )}
      <span className={statusColor}>{statusText}</span>
    </div>
  );
};
