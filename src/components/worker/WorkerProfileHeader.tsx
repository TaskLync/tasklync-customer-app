import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { ArrowLeft, Download, Ellipsis, Star, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { SharedValue } from 'react-native-reanimated';
import { fontFamily } from '../../design/typography';
import { WorkerPublicProfile } from '../../types/worker.types';
import { WorkerAvatar } from './WorkerAvatar';

interface WorkerProfileHeaderProps {
  worker?: WorkerPublicProfile;
  scrollY?: SharedValue<number>;
  onBack: () => void;
  onShare: () => void;
  onMore: () => void;
}

export const WorkerProfileHeader: React.FC<WorkerProfileHeaderProps> = ({
  worker,
  scrollY: _scrollY,
  onBack,
  onShare,
  onMore,
}) => {
  const handleBack = () => {
    onBack();
  };

  const handleShare = () => {
    onShare();
  };

  const handleMore = () => {
    onMore();
  };

  const getPrimaryCategory = () => {
    const firstCat = worker?.categories?.[0];
    if (typeof firstCat === 'string' && firstCat.trim()) return firstCat;
    if (firstCat && typeof firstCat === 'object') {
      return (firstCat as any).categoryName || (firstCat as any).name || 'Specialist';
    }
    const firstSkill = worker?.skills?.[0];
    if (firstSkill && typeof firstSkill === 'object') {
      return firstSkill.categoryName || 'Specialist';
    }
    return 'Specialist';
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'W';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const reviewCount = worker?.totalReviews ?? 0;
  const hasRealRating = typeof worker?.avgRating === 'number' && worker.avgRating > 0 && reviewCount > 0;
  const locationSubtitle = worker?.city
    ? `${getPrimaryCategory()} · ${worker.city}`
    : worker?.distanceLabel
    ? `${getPrimaryCategory()} · ${worker.distanceLabel}`
    : getPrimaryCategory();

  return (
    <View style={styles.container}>
      {/* 1. Top Minimalist Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.navButton, pressed && styles.buttonPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#111827" strokeWidth={2.2} />
        </Pressable>

        <View style={styles.navRightGroup}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.navButton, pressed && styles.buttonPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Save or download profile"
          >
            <Download size={18} color="#111827" strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={handleMore}
            style={({ pressed }) => [styles.navButton, pressed && styles.buttonPressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ellipsis size={18} color="#111827" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* 2. Horizontal Worker Header: [Photo] [Information Stack] */}
      <View style={styles.workerRow}>
        {/* Left: Circular Photo with Clean White Border */}
        <View style={styles.avatarWrapper}>
          <WorkerAvatar
            uri={worker?.avatarUrl}
            name={worker?.name}
            size={86}
            borderWidth={2.5}
            borderColor="#FFFFFF"
          />

          {/* Verification check badge overlapping bottom-right of photo */}
          {worker?.isVerified && (
            <View style={styles.photoVerifyBadge}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          )}
        </View>

        {/* Right: Worker Information Stack */}
        <View style={styles.infoCol}>
          {/* Green Verified Worker Pill */}

          {/* Worker Name in Dark Charcoal */}
          <Text style={styles.nameText} numberOfLines={1}>
            {worker?.name || 'Worker'}
          </Text>

          {/* Service Category & Location in Subtle Gray */}
          <Text style={styles.professionText} numberOfLines={1}>
            {locationSubtitle}
          </Text>

          {/* Star Rating & Review Count */}
          <View style={styles.ratingRow}>
            {hasRealRating ? (
              <>
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{worker?.avgRating?.toFixed(1)}</Text>
                <Text style={styles.reviewCountText}>
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </Text>
              </>
            ) : (
              <Text style={styles.reviewCountText}>No reviews yet</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    position: 'relative',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#DCFCE7',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 26,
    color: '#16A34A',
  },
  photoVerifyBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  infoCol: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    marginBottom: 4,
    gap: 4,
  },
  verifiedPillText: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 11.5,
    color: '#16A34A',
  },
  nameText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 22,
    color: '#111827',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  professionText: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 13.5,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 14,
    color: '#111827',
  },
  reviewCountText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    color: '#6B7280',
  },
});
