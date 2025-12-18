import React from 'react';

export default function FooterNote() {
  return (
    <div className="text-xs sm:text-sm leading-snug opacity-95">
      <span className="font-medium">Personal project</span>. Please consider disabling your ad
      blocker — ads help me maintain the site. Thanks, and enjoy playing Chkobba with your friends!{' '}
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSfLcCluvvArOvjqTdahD5npxS06vpVmkGn2MYSzKWGe7ud3QA/viewform?usp=dialog"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline ml-1"
      >
        Found a bug? Submit here
      </a>
      .
    </div>
  );
}
