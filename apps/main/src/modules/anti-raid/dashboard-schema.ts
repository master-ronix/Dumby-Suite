/**
 * AntiRaid dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const AntiRaidDashboardSchema = {
  moduleSlug: 'anti-raid',
  panels: [
    {
      id: 'anti-raid-selftest-status',
      title: 'Anti Raid status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
