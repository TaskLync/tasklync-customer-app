import { useState, Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAQAccordionItem, FAQItemData } from './FAQAccordionItem';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/**
 * Answers describe what the app actually does (see utils/refundPolicy.ts for cancellation fees).
 * Keep them short, plain English, and never promise anything the product does not do.
 */
export const FAQ_DATA: FAQItemData[] = [
  {
    id: 'faq-1',
    question: 'How do I cancel a booking?',
    answer:
      'Open the booking from the Bookings tab and tap "Cancel booking". If the worker has not accepted yet, there is no fee. After that, a fee may apply depending on how close it is to the booking time. You will see the exact refund before you confirm.',
  },
  {
    id: 'faq-2',
    question: 'How do I contact my worker?',
    answer: 'Once a worker is assigned, you can chat with them or call them from your booking screen.',
  },
  {
    id: 'faq-3',
    question: 'What if my worker is late?',
    answer:
      'You can see where your worker is on the booking screen and chat or call them. If they are very late, contact us and we will help.',
  },
  {
    id: 'faq-4',
    question: 'How do payment and refunds work?',
    answer:
      'You pay the worker in cash after the job is done. If there is a problem with the job, report it from your booking and our support team will look at your photos and details and help you.',
  },
  {
    id: 'faq-5',
    question: 'Is my home address safe?',
    answer: 'Yes. Your exact address is only shared with your assigned worker while your job is active.',
  },
];

/** Minimal accordion: all collapsed by default, one answer open at a time, hairline dividers. */
export const FAQAccordion: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.list}>
      {FAQ_DATA.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && <View style={styles.divider} />}
          <FAQAccordionItem
            item={item}
            isExpanded={item.id === expandedId}
            onToggle={() => handleToggle(item.id)}
          />
        </Fragment>
      ))}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 20,
  },
});
