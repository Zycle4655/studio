import React from 'react';

interface ZycleIconProps extends React.SVGProps<SVGSVGElement> {
  // No specific props needed for now, but can be extended
}

const ZycleIcon: React.FC<ZycleIconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-recycle"
      {...props}
    >
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.758 1.758 0 0 1-.16 фокуси-1.79L4.11 8.505a1.83 1.83 0 0 1 2.22-.706" />
      <path d="m10.53 12.075 4.49-.023" />
      <path d="M14.249 16.142a1.83 1.83 0 0 1-2.963-.061L8.151 6.024a1.83 1.83 0 0 1 1.114-2.308l.21-.08a1.83 1.83 0 0 1 2.399 1.091z" />
      <path d="M18.16 19h2.025a1.83 1.83 0 0 0 1.57-.881 1.758 1.758 0 0 0 .16-1.79l-1.025-8.824a1.83 1.83 0 0 0-2.22-.706" />
    </svg>
  );
};

export default ZycleIcon;
