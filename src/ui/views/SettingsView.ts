/**
 * Settings View
 *
 * User preferences and application settings.
 */

import type { UserPreferences } from '@storage/preferences';
import { getPreferences, updatePreferences, applyTheme, resetPreferences } from '@storage/preferences';
import { createElement, clearChildren } from '@ui/utils/dom';
import { createButton } from '@ui/components/Button';
import { navigate } from '@ui/utils/state';
import { clearAllProfiles, loadAllProfiles } from '@storage/profile-store';

export interface SettingsViewComponent {
  element: HTMLElement;
  destroy(): void;
}

/**
 * Create a settings view component.
 */
export function createSettingsView(): SettingsViewComponent {
  const container = createElement('div', { class: 'settings-view' });
  const components: { destroy(): void }[] = [];
  let currentPreferences: UserPreferences | null = null;

  // Header
  const header = createElement('header', { class: 'settings-view__header' });

  const headerLeft = createElement('div', { class: 'settings-view__header-left' });
  headerLeft.appendChild(
    createElement('h1', { class: 'settings-view__title' }, ['Settings'])
  );
  headerLeft.appendChild(
    createElement('p', { class: 'settings-view__subtitle' }, [
      'Customize your Financial Path Visualizer experience',
    ])
  );
  header.appendChild(headerLeft);

  const headerActions = createElement('div', { class: 'settings-view__actions' });
  const backButton = createButton({
    text: 'Back to Timeline',
    variant: 'secondary',
    onClick: () => navigate('trajectory'),
  });
  components.push(backButton);
  headerActions.appendChild(backButton.element);
  header.appendChild(headerActions);
  container.appendChild(header);

  // Settings sections
  const sectionsContainer = createElement('div', { class: 'settings-view__sections' });
  container.appendChild(sectionsContainer);

  async function initialize(): Promise<void> {
    currentPreferences = await getPreferences();
    renderSections();
  }

  function renderSections(): void {
    clearChildren(sectionsContainer);

    // Appearance section
    sectionsContainer.appendChild(createAppearanceSection());

    // Display section
    sectionsContainer.appendChild(createDisplaySection());

    // Data section
    sectionsContainer.appendChild(createDataSection());

    // About section
    sectionsContainer.appendChild(createAboutSection());
  }

  function createAppearanceSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-view__section' });

    section.appendChild(
      createElement('h2', { class: 'settings-view__section-title' }, ['Appearance'])
    );

    const grid = createElement('div', { class: 'settings-view__grid' });

    // Theme setting
    const themeGroup = createElement('div', { class: 'settings-view__group' });
    themeGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Theme'])
    );
    themeGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'Choose how Financial Path Visualizer looks to you',
      ])
    );

    const themeSelect = createElement('select', {
      class: 'settings-view__select',
    }) as HTMLSelectElement;

    const themeOptions = [
      { value: 'system', label: 'System (Auto)' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ];

    for (const option of themeOptions) {
      const opt = createElement('option', { value: option.value }, [option.label]) as HTMLOptionElement;
      if (currentPreferences?.theme === option.value) {
        opt.selected = true;
      }
      themeSelect.appendChild(opt);
    }

    themeSelect.addEventListener('change', async () => {
      const theme = themeSelect.value as 'system' | 'light' | 'dark';
      await updatePreferences({ theme });
      applyTheme(theme);
      currentPreferences = await getPreferences();
    });

    themeGroup.appendChild(themeSelect);
    grid.appendChild(themeGroup);

    section.appendChild(grid);
    return section;
  }

  function createDisplaySection(): HTMLElement {
    const section = createElement('section', { class: 'settings-view__section' });

    section.appendChild(
      createElement('h2', { class: 'settings-view__section-title' }, ['Display'])
    );

    const grid = createElement('div', { class: 'settings-view__grid' });

    // Currency setting
    const currencyGroup = createElement('div', { class: 'settings-view__group' });
    currencyGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Currency'])
    );
    currencyGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'Currency format for displaying amounts',
      ])
    );

    const currencySelect = createElement('select', {
      class: 'settings-view__select',
    }) as HTMLSelectElement;

    const currencyOptions = [
      { value: 'USD', label: 'US Dollar ($)' },
      { value: 'EUR', label: 'Euro (€)' },
      { value: 'GBP', label: 'British Pound (£)' },
      { value: 'CAD', label: 'Canadian Dollar (C$)' },
      { value: 'AUD', label: 'Australian Dollar (A$)' },
    ];

    for (const option of currencyOptions) {
      const opt = createElement('option', { value: option.value }, [option.label]) as HTMLOptionElement;
      if (currentPreferences?.currency === option.value) {
        opt.selected = true;
      }
      currencySelect.appendChild(opt);
    }

    currencySelect.addEventListener('change', async () => {
      await updatePreferences({ currency: currencySelect.value });
      currentPreferences = await getPreferences();
    });

    currencyGroup.appendChild(currencySelect);
    grid.appendChild(currencyGroup);

    // Date format setting
    const dateGroup = createElement('div', { class: 'settings-view__group' });
    dateGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Date Format'])
    );
    dateGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'How dates are displayed throughout the app',
      ])
    );

    const dateSelect = createElement('select', {
      class: 'settings-view__select',
    }) as HTMLSelectElement;

    const dateOptions = [
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    ];

    for (const option of dateOptions) {
      const opt = createElement('option', { value: option.value }, [option.label]) as HTMLOptionElement;
      if (currentPreferences?.dateFormat === option.value) {
        opt.selected = true;
      }
      dateSelect.appendChild(opt);
    }

    dateSelect.addEventListener('change', async () => {
      const dateFormat = dateSelect.value as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
      await updatePreferences({ dateFormat });
      currentPreferences = await getPreferences();
    });

    dateGroup.appendChild(dateSelect);
    grid.appendChild(dateGroup);

    section.appendChild(grid);
    return section;
  }

  function createDataSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-view__section' });

    section.appendChild(
      createElement('h2', { class: 'settings-view__section-title' }, ['Data Management'])
    );

    const grid = createElement('div', { class: 'settings-view__grid' });

    // Export data
    const exportGroup = createElement('div', { class: 'settings-view__group' });
    exportGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Export Data'])
    );
    exportGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'Download all your financial profiles as a JSON file',
      ])
    );

    const exportButton = createButton({
      text: 'Export All Data',
      variant: 'secondary',
      onClick: async () => {
        const profiles = await loadAllProfiles();
        if (profiles.length === 0) {
          alert('No profiles to export.');
          return;
        }
        const { downloadMultipleProfiles } = await import('@storage/export');
        downloadMultipleProfiles(profiles);
      },
    });
    components.push(exportButton);
    exportGroup.appendChild(exportButton.element);
    grid.appendChild(exportGroup);

    // Import data
    const importGroup = createElement('div', { class: 'settings-view__group' });
    importGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Import Data'])
    );
    importGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'Import financial profiles from a JSON file',
      ])
    );

    const importInput = createElement('input', {
      type: 'file',
      accept: '.json',
      class: 'settings-view__file-input',
      id: 'import-file',
    }) as HTMLInputElement;

    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (file) {
        try {
          const { importFromFile } = await import('@storage/export');
          await importFromFile(file);
          alert('Import successful!');
        } catch (error) {
          alert('Import failed. Please check the file format.');
        }
      }
    });

    const importLabel = createElement('label', {
      for: 'import-file',
      class: 'settings-view__file-label btn btn--secondary',
    }, ['Choose File']);

    importGroup.appendChild(importInput);
    importGroup.appendChild(importLabel);
    grid.appendChild(importGroup);

    // Clear all data
    const clearGroup = createElement('div', { class: 'settings-view__group settings-view__group--danger' });
    clearGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Clear All Data'])
    );
    clearGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'Permanently delete all profiles and settings. This cannot be undone.',
      ])
    );

    const clearButton = createButton({
      text: 'Clear All Data',
      variant: 'danger',
      onClick: async () => {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
          if (confirm('This will permanently delete all your profiles. Continue?')) {
            await clearAllProfiles();
            await resetPreferences();
            navigate('quick-start');
          }
        }
      },
    });
    components.push(clearButton);
    clearGroup.appendChild(clearButton.element);
    grid.appendChild(clearGroup);

    section.appendChild(grid);
    return section;
  }

  function createAboutSection(): HTMLElement {
    const section = createElement('section', { class: 'settings-view__section' });

    section.appendChild(
      createElement('h2', { class: 'settings-view__section-title' }, ['About'])
    );

    const content = createElement('div', { class: 'settings-view__about' });

    content.appendChild(
      createElement('p', {}, [
        'Financial Path Visualizer helps you plan and visualize your financial future.',
      ])
    );

    content.appendChild(
      createElement('p', { class: 'settings-view__version' }, ['Version 0.1.0'])
    );

    const features = createElement('ul', { class: 'settings-view__features' });
    const featureList = [
      'Project your financial trajectory over time',
      'Identify optimization opportunities',
      'Compare what-if scenarios',
      'All data stored locally in your browser',
    ];

    for (const feature of featureList) {
      features.appendChild(createElement('li', {}, [feature]));
    }

    content.appendChild(features);

    content.appendChild(
      createElement('p', { class: 'settings-view__privacy' }, [
        'Your financial data never leaves your device. All calculations happen locally in your browser.',
      ])
    );

    // Help button
    const helpGroup = createElement('div', { class: 'settings-view__group' });
    helpGroup.appendChild(
      createElement('label', { class: 'settings-view__label' }, ['Need Help?'])
    );
    helpGroup.appendChild(
      createElement('p', { class: 'settings-view__description' }, [
        'View the user guide for detailed instructions on using this tool',
      ])
    );

    const helpButton = createButton({
      text: 'Open User Guide',
      variant: 'secondary',
      onClick: () => navigate('help'),
    });
    components.push(helpButton);
    helpGroup.appendChild(helpButton.element);
    content.appendChild(helpGroup);

    section.appendChild(content);
    return section;
  }

  // Initialize
  initialize();

  return {
    element: container,

    destroy(): void {
      for (const component of components) {
        component.destroy();
      }
    },
  };
}
