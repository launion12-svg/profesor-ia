
import React from 'react';

const AcademicCapIcon: React.FC<{ className?: string }> = ({ className = "h-12 w-12 text-indigo-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 14l9-5-9-5-9-5 9 5z" />
        <path d="M12 14l6.16-3.422A12.083 12.083 0 0121 18.72V19M4.84 10.578A12.083 12.083 0 013 18.72V19" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0l-3-2m3 2l3-2" />
    </svg>
);

export default AcademicCapIcon;
