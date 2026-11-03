import { useState, Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAQAccordionItem, FAQItemData } from './FAQAccordionItem';
import { colors, palette, radius, spacing, shadows } from '../../design';

export const FAQ_DATA: FAQItemData[] = [
  {
    id: 'faq-1',
    question: 'How do I cancel a booking?',
    answer:
      'You can cancel an upcoming booking anytime from the Bookings tab by opening the booking details and tapping "Cancel Booking". Cancellations made before the worker is en route incur zero cancellation fees.',
  },
  {
    id: 'faq-2',
    question: 'How do I contact my assigned professional?',
    answer:
      'Once a professional is assigned to your job, an in-app Chat and direct phone call option appear on your booking tracking screen for seamless, real-time coordination.',
  },
  {
    id: 'faq-3',
    question: 'What happens if a worker is delayed?',
    answer:
      'Tasklync monitors real-time GPS tracking for all en-route workers. If a delay occurs, our automated system and support team will alert you and offer free rescheduling or re-dispatching if needed.',
  },
  {
    id: 'faq-4',
    question: 'How does escrow protection and refund work?',
    answer:
      'All payments are held securely in escrow and only released to the professional after you confirm satisfactory completion. In case of disputes, our mediation team reviews photo evidence and guarantees full resolution.',
  },
  {
    id: 'faq-5',
    question: 'Is my payment information and home address secure?',
    answer:
      'Yes. All payment credentials (JazzCash, EasyPaisa, and Card data) are encrypted with 256-bit bank-grade SSL standards. Your precise address is only shared with your assigned professional during active job dispatch.',
  },
];

export const FAQAccordion: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>('faq-1'); // Default expand top question

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.cardContainer}>
      {FAQ_DATA.map((item, index) => {
        const isLast = index === FAQ_DATA.length - 1;
        const isExpanded = item.id === expandedId;

        return (
          <Fragment key={item.id}>
            <FAQAccordionItem
              item={item}
              isExpanded={isExpanded}
              onToggle={() => handleToggle(item.id)}
            />
            {!isLast && <View style={styles.divider} />}
          </Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: palette.gray100,
    marginLeft: spacing.base,
  },
});
