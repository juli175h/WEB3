import React from 'react';

// Placeholder Page component — original repo contained a Vue SFC here.
// This React stub prevents the TypeScript build from attempting to parse a Vue file.
const Page: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return <div className="page-root">{children}</div>;
};

export default Page;
