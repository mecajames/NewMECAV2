import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  /**
   * After a page change, scroll the window back to the top so the user
   * lands at the start of the new page's content instead of staying
   * pinned to the pagination footer. Default true; set false if the
   * paginated list lives inside a modal or other scroll container.
   */
  scrollToTopOnPageChange?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [25, 50, 100, 250],
  scrollToTopOnPageChange = true,
}: PaginationProps) {
  if (totalItems === 0) return null;

  // Wrap page transitions so the viewport jumps back to the top of the
  // page — clicking "Next" at the bottom of a long list and staying at
  // the bottom is disorienting on every page that uses this component.
  // Smooth-scroll respects `prefers-reduced-motion` automatically.
  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (scrollToTopOnPageChange && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-slate-800 border-t border-slate-600">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
          Page {currentPage} of {totalPages || 1}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-gray-400">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              handlePageChange(1);
            }}
            className="bg-slate-700 text-white text-xs sm:text-sm rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">per page</span>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            First
          </button>
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-white">
            {currentPage}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
