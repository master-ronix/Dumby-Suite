export interface PaginatedResult<T> {
  items: readonly T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PageOptions {
  page?: number;
  pageSize?: number;
}

export function paginate<T>(items: readonly T[], options: PageOptions = {}): PaginatedResult<T> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return { items: items.slice(start, end), total, page, pageSize, totalPages };
}

export function buildPageButtons(currentPage: number, totalPages: number) {
  const buttons: Array<{ label: string; customId: string; disabled: boolean }> = [];
  buttons.push({
    label: 'Previous',
    customId: `page:${currentPage - 1}`,
    disabled: currentPage <= 1,
  });
  buttons.push({
    label: 'Next',
    customId: `page:${currentPage + 1}`,
    disabled: currentPage >= totalPages,
  });
  return buttons;
}
