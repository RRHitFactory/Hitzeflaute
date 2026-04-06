'use client';

import React from 'react';
import WindTurbine from '@/components/props/generators/WindTurbine';
import Solar from '@/components/props/generators/Solar';
import Nuclear from '@/components/props/generators/Nuclear';
import Lignite from '@/components/props/generators/Lignite';
import GasTurbine from '@/components/props/generators/GasTurbine';
import Coal from '@/components/props/generators/Coal';
import Ccgt from '@/components/props/generators/Ccgt';
import Freezer from '@/components/props/loads/Freezer';
import Industrial from '@/components/props/loads/Industrial';
import Residential from '@/components/props/loads/Residential';

const PropsGalleryPage = () => {
  const components = [
    { Component: WindTurbine, name: 'Wind Turbine' },
    { Component: Solar, name: 'Solar' },
    { Component: Nuclear, name: 'Nuclear' },
    { Component: Lignite, name: 'Lignite' },
    { Component: GasTurbine, name: 'Gas Turbine' },
    { Component: Coal, name: 'Coal' },
    { Component: Ccgt, name: 'CCGT' },
    { Component: Freezer, name: 'Freezer' },
    { Component: Industrial, name: 'Industrial' },
    { Component: Residential, name: 'Residential' },
  ];

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Props Gallery</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {components.map(({ Component, name }) => (
          <div key={name} className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4">{name}</h2>
            <svg width="200" height="200" viewBox="0 0 200 200" className="border border-gray-300 rounded-md">
              <g transform="translate(100, 100)">
                <Component ownerColor="#ff0000" position={{ x: 0, y: 0 }} />
              </g>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropsGalleryPage;
