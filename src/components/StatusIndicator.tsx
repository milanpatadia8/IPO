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
  let statusColor = 'text-[#6B7280]';

  switch (status) {
    case 'ongoing':
      statusText = 'Open';
      statusColor = 'text-[#16A34A] font-medium';
      break;
    case 'upcoming':
      if (announcementStatus === 'dates_announced') {
        statusText = 'Dates Announced';
        statusColor = 'text-[#111827] font-medium';
      } else if (announcementStatus === 'expected') {
        statusText = 'DRHP Filed';
        statusColor = 'text-[#6B7280] font-medium';
      } else {
        statusText = 'Upcoming';
        statusColor = 'text-[#111827] font-medium';
      }
      break;
    case 'listed':
      statusText = 'Listed';
      statusColor = 'text-[#4B5563] font-medium';
      break;
    case 'closed':
      statusText = 'Closed';
      statusColor = 'text-[#6B7280] font-medium';
      break;
    case 'postponed':
      statusText = 'Postponed';
      statusColor = 'text-[#DC2626] font-medium';
      break;
    case 'withdrawn':
      statusText = 'Withdrawn';
      statusColor = 'text-[#DC2626] font-medium';
      break;
    default:
      statusText = status;
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-sm">
      {category && (
        <>
          <span className="font-medium text-[#111827]">{category}</span>
          <span className="text-[#D1D5DB]" aria-hidden="true">·</span>
        </>
      )}
      <span className={statusColor}>{statusText}</span>
    </div>
  );
};
