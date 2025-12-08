import React from 'react';
import { ArchiveView } from '../components/archiveV2/ArchiveView';

const ArchiveV2 = () => {
  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden animate-fade-in">
      <main className="flex-1 overflow-hidden p-4 md:p-6">
        <ArchiveView />
      </main>
    </div>
  );
};

export default ArchiveV2;
