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
  let statusColor = 'text-[#78716C]';

  switch (status) {
    case 'ongoing':
      statusText = 'Open';
      statusColor = 'text-[#15803D] font-medium';
      break;
    case 'upcoming':
      if (announcementStatus === 'dates_announced') {
        statusText = 'Dates Announced';
        statusColor = 'text-[#14532D] font-medium';
      } else if (announcementStatus === 'expected') {
        statusText = 'DRHP Filed';
        statusColor = 'text-[#9A5B13] font-medium';
      } else {
        statusText = 'Upcoming';
        statusColor = 'text-[#9A5B13] font-medium';
      }
      break;
    case 'listed':
      statusText = 'Listed';
      statusColor = 'text-[#57534E] font-medium';
      break;
    case 'closed':
      statusText = 'Closed';
      statusColor = 'text-[#78716C] font-medium';
      break;
    case 'postponed':
      statusText = 'Postponed';
      statusColor = 'text-[#B91C1C] font-medium';
      break;
    case 'withdrawn':
      statusText = 'Withdrawn';
      statusColor = 'text-[#B91C1C] font-medium';
      break;
    default:
      statusText = status;
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-sm">
      {category && (
        <>
          <span
            className={`font-medium ${
              category === 'SME' ? 'text-[#9A5B13]' : 'text-[#14532D]'
            }`}
          >
            {category}
          </span>
          <span className="text-[#D6CEC0]" aria-hidden="true">·</span>
        </>
      )}
      <span className={statusColor}>{statusText}</span>
    </div>
  );
};
