import React from 'react';
import { Alert } from '../ui/Alert';

export interface DisclaimerProps {
  variant?: 'compact' | 'full';
  className?: string;
  style?: React.CSSProperties;
}

export const MedicalDisclaimer: React.FC<DisclaimerProps> = ({
  variant = 'compact',
  className = '',
  style,
}) => {
  if (variant === 'full') {
    return (
      <div className={`${className}`} style={style}>
        <Alert variant="warning" title="Medical Disclaimer">
          <div className="space-y-2">
            <p>
              The information provided by PetCheck is for informational purposes only and is not
              intended to replace professional veterinary advice, diagnosis, or treatment.
            </p>
            <p>
              Always seek the advice of your veterinarian or other qualified animal health provider
              with any questions you may have regarding a medical condition or treatment.
            </p>
            <p>
              Never disregard professional veterinary advice or delay in seeking it because of
              something you have read on this application.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className={`text-xs text-slate-500 dark:text-slate-400 text-center ${className}`}
      style={style}
    >
      <p>
        This information is for educational purposes only. Always consult your veterinarian
        before making any changes to your pet's medication or treatment plan.
      </p>
    </div>
  );
};

export default MedicalDisclaimer;
