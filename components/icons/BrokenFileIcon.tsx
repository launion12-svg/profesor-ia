import React from 'react';

// Using a style inspired by the user's image, but vectorized and clean to fit the app's theme.
const BrokenFileIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        {/* Document shape with folded corner */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v6h6" />
        {/* Sad face */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15a3 3 0 006 0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12h.01M14.5 12h.01" />
    </svg>
);

export default BrokenFileIcon;
