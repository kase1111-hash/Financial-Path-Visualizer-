/**
 * Help View
 *
 * In-app user guide and documentation.
 */

import { createElement } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { navigate } from '@ui/utils/state';

export interface HelpViewComponent {
  element: HTMLElement;
  destroy(): void;
}

interface HelpSection {
  id: string;
  title: string;
  content: () => HTMLElement;
}

/**
 * Create a help view component.
 */
export function createHelpView(): HelpViewComponent {
  const container = createElement('div', { class: 'help-view' });
  const components: { destroy(): void }[] = [];

  // Header
  const header = createElement('header', { class: 'help-view__header' });

  const headerLeft = createElement('div', { class: 'help-view__header-left' });
  headerLeft.appendChild(
    createElement('h1', { class: 'help-view__title' }, ['User Guide'])
  );
  headerLeft.appendChild(
    createElement('p', { class: 'help-view__subtitle' }, [
      'Learn how to use Financial Path Visualizer',
    ])
  );
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'help-view__actions' });
  const backButton = createButton({
    text: 'Back to Timeline',
    variant: 'secondary',
    onClick: () => navigate('trajectory'),
  });
  components.push(backButton);
  headerActions.appendChild(backButton.element);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Table of contents and content
  const body = createElement('div', { class: 'help-view__body' });

  // Define sections
  const sections: HelpSection[] = [
    { id: 'getting-started', title: 'Getting Started', content: createGettingStartedSection },
    { id: 'quick-start', title: 'Quick Start', content: createQuickStartSection },
    { id: 'trajectory', title: 'Trajectory View', content: createTrajectorySection },
    { id: 'optimizations', title: 'Optimizations', content: createOptimizationsSection },
    { id: 'comparisons', title: 'Comparing Scenarios', content: createComparisonsSection },
    { id: 'profile-editor', title: 'Profile Editor', content: createProfileEditorSection },
    { id: 'understanding-numbers', title: 'Understanding the Numbers', content: createUnderstandingNumbersSection },
    { id: 'privacy', title: 'Privacy & Data', content: createPrivacySection },
    { id: 'faq', title: 'FAQ', content: createFAQSection },
  ];

  // Table of contents
  const toc = createElement('nav', { class: 'help-view__toc' });
  toc.appendChild(createElement('h2', { class: 'help-view__toc-title' }, ['Contents']));
  const tocList = createElement('ul', { class: 'help-view__toc-list' });

  for (const section of sections) {
    const item = createElement('li', { class: 'help-view__toc-item' });
    const link = createElement('a', {
      href: `#${section.id}`,
      class: 'help-view__toc-link',
    }, [section.title]);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(section.id);
      target?.scrollIntoView({ behavior: 'smooth' });
    });
    item.appendChild(link);
    tocList.appendChild(item);
  }

  toc.appendChild(tocList);
  body.appendChild(toc);

  // Content sections
  const content = createElement('div', { class: 'help-view__content' });

  for (const section of sections) {
    const sectionEl = createElement('section', {
      id: section.id,
      class: 'help-view__section',
    });
    sectionEl.appendChild(
      createElement('h2', { class: 'help-view__section-title' }, [section.title])
    );
    sectionEl.appendChild(section.content());
    content.appendChild(sectionEl);
  }

  body.appendChild(content);
  container.appendChild(body);

  return {
    element: container,

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}

function createGettingStartedSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'Financial Path Visualizer helps you see where your financial decisions lead. ' +
    'Instead of tracking expenses or budgeting categories, this tool projects your ' +
    'trajectory over time based on your income, debts, and goals.',
  ]));

  const list = createElement('ul', {});
  const items = [
    'See your projected net worth over the next 30+ years',
    'Identify optimization opportunities you might be missing',
    'Compare "what-if" scenarios before making major decisions',
    'Understand the true lifetime cost of purchases',
  ];
  for (const item of items) {
    list.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(list);

  content.appendChild(createElement('h3', {}, ['Who This Is For']));
  content.appendChild(createElement('p', {}, [
    'This tool is for anyone who wants to understand their financial trajectory. ' +
    'You don\'t need precise numbers - ballpark estimates work fine. ' +
    'The value is in seeing the direction and relative impact of decisions.',
  ]));

  return content;
}

function createQuickStartSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'When you first open the app, you\'ll see a simplified form to get started quickly.',
  ]));

  const steps = createElement('ol', {});
  const stepItems = [
    'Enter your annual gross income (before taxes)',
    'Add your current age and target retirement age',
    'The app calculates your trajectory based on standard assumptions',
    'From there, you can refine your profile with more details',
  ];
  for (const item of stepItems) {
    steps.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(steps);

  content.appendChild(createElement('h3', {}, ['Don\'t Worry About Precision']));
  content.appendChild(createElement('p', {}, [
    'The Quick Start is designed to give you a useful projection even with minimal input. ' +
    'You can always add more detail later through the Profile Editor.',
  ]));

  return content;
}

function createTrajectorySection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'The Trajectory View is your main dashboard. It shows your projected financial path ' +
    'from now until retirement and beyond.',
  ]));

  content.appendChild(createElement('h3', {}, ['The Chart']));
  content.appendChild(createElement('p', {}, [
    'The main chart shows your projected net worth over time. The line represents your ' +
    'expected wealth if you continue on your current path. Hover over any point to see ' +
    'the details for that year.',
  ]));

  content.appendChild(createElement('h3', {}, ['Summary Cards']));
  content.appendChild(createElement('p', {}, [
    'Below the chart, summary cards show key metrics:',
  ]));

  const metrics = createElement('ul', {});
  const metricItems = [
    'Current Net Worth - Your assets minus your debts right now',
    'Retirement Year - When you\'re projected to reach your retirement goal',
    'Net Worth at Retirement - What you\'ll have when you stop working',
    'Savings Rate - What percentage of income you\'re saving',
  ];
  for (const item of metricItems) {
    metrics.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(metrics);

  content.appendChild(createElement('h3', {}, ['Year Selector']));
  content.appendChild(createElement('p', {}, [
    'Use the slider to explore specific years in your projection. This updates ' +
    'the detailed breakdown for that year.',
  ]));

  return content;
}

function createOptimizationsSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'The Optimizations view surfaces opportunities to improve your financial trajectory. ' +
    'These are actionable suggestions based on your specific situation.',
  ]));

  content.appendChild(createElement('h3', {}, ['Types of Optimizations']));

  const types = createElement('ul', {});
  const typeItems = [
    'Tax - Retirement contributions, tax-loss harvesting, bracket optimization',
    'Debt - Payoff ordering, refinancing opportunities, PMI removal',
    'Savings - Emergency fund sizing, high-yield account opportunities',
    'Housing - Rent vs buy analysis, downsizing impact',
    'Income - Salary negotiation timing, side income impact',
  ];
  for (const item of typeItems) {
    types.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(types);

  content.appendChild(createElement('h3', {}, ['Confidence Levels']));
  content.appendChild(createElement('p', {}, [
    'Each optimization has a confidence level indicating how certain the recommendation is:',
  ]));

  const confidence = createElement('ul', {});
  const confItems = [
    'High - Mathematical certainty (e.g., paying off 22% APR debt)',
    'Medium - Good probability based on typical patterns',
    'Low - Worth considering but depends on your situation',
  ];
  for (const item of confItems) {
    confidence.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(confidence);

  return content;
}

function createComparisonsSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'The Compare feature lets you see how changes would affect your trajectory. ' +
    'This is powerful for major decisions like buying a house or changing jobs.',
  ]));

  content.appendChild(createElement('h3', {}, ['Quick Scenarios']));
  content.appendChild(createElement('p', {}, [
    'Pre-built scenarios let you quickly see the impact of common changes:',
  ]));

  const scenarios = createElement('ul', {});
  const scenarioItems = [
    'Salary increase - What if you earned 10% more?',
    'Extra savings - What if you saved an extra $500/month?',
    'Earlier retirement - What would it take to retire 5 years sooner?',
    'Home purchase - How does buying affect your trajectory?',
  ];
  for (const item of scenarioItems) {
    scenarios.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(scenarios);

  content.appendChild(createElement('h3', {}, ['Custom Comparisons']));
  content.appendChild(createElement('p', {}, [
    'For more complex scenarios, you can create a custom comparison by modifying ' +
    'any aspect of your profile and seeing the side-by-side impact.',
  ]));

  content.appendChild(createElement('h3', {}, ['Reading the Results']));
  content.appendChild(createElement('p', {}, [
    'The comparison view shows both trajectories overlaid, with clear indicators ' +
    'of where they diverge. Key metrics show the difference in retirement date, ' +
    'lifetime wealth, and other factors.',
  ]));

  return content;
}

function createProfileEditorSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', {}, [
    'The Profile Editor lets you input detailed financial information for more ' +
    'accurate projections.',
  ]));

  content.appendChild(createElement('h3', {}, ['Income Sources']));
  content.appendChild(createElement('p', {}, [
    'Add all sources of income: salary, hourly wages, bonuses, side work, etc. ' +
    'Include expected growth rates for raises and promotions.',
  ]));

  content.appendChild(createElement('h3', {}, ['Debts']));
  content.appendChild(createElement('p', {}, [
    'List your debts with interest rates, minimum payments, and remaining balance. ' +
    'This includes mortgages, car loans, student loans, and credit cards.',
  ]));

  content.appendChild(createElement('h3', {}, ['Assets']));
  content.appendChild(createElement('p', {}, [
    'Add investment accounts, real estate, and other assets. Include expected ' +
    'growth rates based on your investment strategy.',
  ]));

  content.appendChild(createElement('h3', {}, ['Goals']));
  content.appendChild(createElement('p', {}, [
    'Define your financial goals with target dates and amounts. This helps the ' +
    'projection show whether you\'re on track.',
  ]));

  return content;
}

function createUnderstandingNumbersSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('h3', {}, ['Net Worth']));
  content.appendChild(createElement('p', {}, [
    'Total assets minus total liabilities. This is the primary metric for tracking ' +
    'wealth over time.',
  ]));

  content.appendChild(createElement('h3', {}, ['Savings Rate']));
  content.appendChild(createElement('p', {}, [
    'The percentage of your gross income that goes toward building wealth (savings, ' +
    'investments, debt principal). A higher rate means faster progress toward goals.',
  ]));

  content.appendChild(createElement('h3', {}, ['Projections and Assumptions']));
  content.appendChild(createElement('p', {}, [
    'All projections use reasonable assumptions:',
  ]));

  const assumptions = createElement('ul', {});
  const assumptionItems = [
    'Inflation: 2.5% annually (adjustable)',
    'Investment returns: 7% before inflation (adjustable)',
    'Salary growth: 3% annually (adjustable)',
    'Tax brackets: Current federal and state rates',
  ];
  for (const item of assumptionItems) {
    assumptions.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(assumptions);

  content.appendChild(createElement('p', { class: 'help-view__note' }, [
    'These are projections, not guarantees. Markets fluctuate, life happens. ' +
    'Use these numbers to understand direction and magnitude, not precise outcomes.',
  ]));

  return content;
}

function createPrivacySection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  content.appendChild(createElement('p', { class: 'help-view__highlight' }, [
    'Your financial data never leaves your device.',
  ]));

  content.appendChild(createElement('p', {}, [
    'Financial Path Visualizer stores all data locally in your browser using IndexedDB. ' +
    'No accounts, no servers, no cloud storage.',
  ]));

  content.appendChild(createElement('h3', {}, ['What This Means']));

  const privacy = createElement('ul', {});
  const privacyItems = [
    'Your data stays on your computer',
    'Clearing browser data deletes your profiles',
    'You can export/import data for backup',
    'No one can access your financial information',
  ];
  for (const item of privacyItems) {
    privacy.appendChild(createElement('li', {}, [item]));
  }
  content.appendChild(privacy);

  content.appendChild(createElement('h3', {}, ['Backing Up Your Data']));
  content.appendChild(createElement('p', {}, [
    'Use Settings > Export Data to download your profiles as a JSON file. ' +
    'Keep this file secure - it contains your financial information.',
  ]));

  return content;
}

function createFAQSection(): HTMLElement {
  const content = createElement('div', { class: 'help-view__section-content' });

  const faqs = [
    {
      q: 'How accurate are the projections?',
      a: 'Projections are based on the data you provide and standard assumptions. ' +
         'They\'re useful for understanding direction and relative impact, not precise ' +
         'predictions. Real outcomes depend on market performance, life events, and decisions.',
    },
    {
      q: 'What if I don\'t know my exact numbers?',
      a: 'Estimates work fine. The tool is designed to be useful even with approximate ' +
         'figures. You can always refine your profile as you learn more.',
    },
    {
      q: 'Can I have multiple profiles?',
      a: 'Yes. Use the Profile Editor to create and switch between different scenarios ' +
         'or profiles for different people.',
    },
    {
      q: 'How do I model a major purchase?',
      a: 'Use the Compare feature to create a scenario with the purchase. This shows ' +
         'the impact on your trajectory compared to your current path.',
    },
    {
      q: 'Why isn\'t my exact situation supported?',
      a: 'The tool focuses on the most common financial patterns. Complex situations ' +
         'like business ownership, variable income, or unusual tax situations may need ' +
         'simplification.',
    },
    {
      q: 'What happens if I clear my browser data?',
      a: 'Your profiles will be deleted. Export your data regularly if you want to ' +
         'keep it safe.',
    },
  ];

  for (const faq of faqs) {
    const item = createElement('div', { class: 'help-view__faq-item' });
    item.appendChild(createElement('h4', { class: 'help-view__faq-question' }, [faq.q]));
    item.appendChild(createElement('p', { class: 'help-view__faq-answer' }, [faq.a]));
    content.appendChild(item);
  }

  return content;
}
