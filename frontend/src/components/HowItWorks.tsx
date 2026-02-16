import React from 'react';

const steps = [
  {
    label: '1. Enter Destination',
    description:
      'Input where you want to go. We’ll analyze every possible path using real-time and historical air quality data.',
  },
  {
    label: '2. Compare Route AQI',
    description:
      'See the air quality index for each route, plus detailed exposure predictions for your entire journey.',
  },
  {
    label: '3. Choose Health',
    description:
      'Pick the path with the lowest pollutants and track how much healthier your commute has become over time.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section className="mx-auto mb-20 mt-4 max-w-5xl">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-green-soft">
          How it Works
        </p>
        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Three simple steps to a healthier commute.</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className="relative rounded-3xl border border-soft/70 bg-card-bg/80 p-5 shadow-card-soft"
          >
            <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-green/15 text-sm font-semibold text-accent-green-soft">
              {step.label.split('.')[0]}
            </div>
            <h3 className="mb-2 text-sm font-semibold text-white/95">{step.label}</h3>
            <p className="text-xs leading-relaxed text-muted-text">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;

