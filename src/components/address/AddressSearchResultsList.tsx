import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { MapPin, History, Trash2, MapPinOff, AlertCircle } from 'lucide-react-native';
import { PlacePrediction } from '../../types/address.types';
import { colors, palette, fontFamily, radius, fontSize, shadows } from '../../design';

export interface AddressSearchResultsListProps {
  predictions: PlacePrediction[];
  recentSearches: PlacePrediction[];
  query: string;
  onSelectPrediction: (prediction: PlacePrediction) => void;
  onClearRecentSearches?: (() => void) | undefined;
  isLoading?: boolean | undefined;
  isError?: boolean | undefined;
}

export const AddressSearchResultsList: React.FC<AddressSearchResultsListProps> = ({
  predictions,
  recentSearches,
  query,
  onSelectPrediction,
  onClearRecentSearches,
  isLoading = false,
  isError = false,
}) => {
  const cleanQuery = query.trim();
  const isShowingRecents = cleanQuery.length === 0 && recentSearches.length > 0;
  const isQueryActive = cleanQuery.length >= 2;

  if (!isShowingRecents && !isQueryActive) {
    return null;
  }

  const itemsToRender = isShowingRecents ? recentSearches : predictions;

  const handleSelect = (item: PlacePrediction) => {
    Keyboard.dismiss();
    onSelectPrediction(item);
  };

  return (
    <View style={styles.card}>
      {isLoading && isQueryActive && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primaryDark} />
          <Text style={styles.stateText} maxFontSizeMultiplier={1.3}>
            Searching in Faisalabad...
          </Text>
        </View>
      )}

      {!isLoading && isError && isQueryActive && (
        <View style={styles.errorContainer}>
          <AlertCircle size={18} color={palette.danger} />
          <Text style={styles.stateText} maxFontSizeMultiplier={1.3}>
            Unable to search places. Please check your connection.
          </Text>
        </View>
      )}

      {!isLoading && !isError && isQueryActive && predictions.length === 0 && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <MapPinOff size={20} color={palette.gray400} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.3}>
            No addresses found in Faisalabad
          </Text>
          <Text style={styles.emptySubtext} maxFontSizeMultiplier={1.3}>
            Try searching for a nearby area, street, or major landmark.
          </Text>
        </View>
      )}
      {isShowingRecents && (
        <View style={styles.recentsHeader}>
          <View style={styles.recentsTitleRow}>
            <History size={14} color={palette.gray500} strokeWidth={2} />
            <Text style={styles.recentsTitle} maxFontSizeMultiplier={1.3}>
              Recent Searches
            </Text>
          </View>
          {onClearRecentSearches && (
            <Pressable
              onPress={() => {
                onClearRecentSearches();
              }}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear recent search history"
            >
              <Trash2 size={13} color={palette.gray400} />
              <Text style={styles.clearText} maxFontSizeMultiplier={1.3}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollList}
      >
        {itemsToRender.slice(0, 5).map((item, index) => {
          const isLast = index === Math.min(itemsToRender.length, 5) - 1;
          const a11yLabel = `${item.primary_text}, ${item.secondary_text || ''}`;

          return (
            <Pressable
              key={item.place_id || `${index}_${item.primary_text}`}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.resultRow,
                pressed && styles.resultRowPressed,
                !isLast && styles.resultRowBorder,
              ]}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityHint="Selects this location on the map"
            >
              <View style={styles.iconCircle}>
                {isShowingRecents ? (
                  <History size={16} color={palette.gray500} />
                ) : (
                  <MapPin size={16} color={colors.primaryDark} />
                )}
              </View>

              <View style={styles.textColumn}>
                <Text
                  style={styles.primaryText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {item.primary_text}
                </Text>
                {Boolean(item.secondary_text) && (
                  <Text
                    style={styles.secondaryText}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {item.secondary_text}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 8,
    maxHeight: 280,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  recentsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentsTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: palette.gray500,
  },
  scrollList: {
    maxHeight: 240,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  resultRowPressed: {
    backgroundColor: palette.gray50,
  },
  resultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.gray100,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.iceGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  secondaryText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stateText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.body2,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: fontSize.caption,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
