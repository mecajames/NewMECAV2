export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Generate JSON-LD FAQPage schema
 * https://schema.org/FAQPage
 *
 * Enables rich FAQ snippets in search results, showing expandable
 * question/answer pairs directly on the search page.
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
