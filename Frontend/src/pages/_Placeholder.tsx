import React from 'react';

export default function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}



