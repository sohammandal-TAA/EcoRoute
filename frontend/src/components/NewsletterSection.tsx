import React from 'react';

const NewsletterSection: React.FC = () => {
  return (
    <section className="mx-auto mb-16 mt-6 max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-green-soft">
        Stay informed about your local air quality
      </p>
      <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
        Get weekly insights and air quality alerts delivered to your inbox.
      </h2>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="email"
          placeholder="Enter your email address"
          className="w-full max-w-md rounded-2xl border border-soft bg-card-bg/80 px-4 py-3 text-sm text-white placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-accent-green-soft/70"
        />
        <button type="submit" className="primary-cta w-full sm:w-auto">
          Subscribe
        </button>
      </form>
    </section>
  );
};

export default NewsletterSection;

