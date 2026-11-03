import { FC } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ZoomControl } from './ZoomControl';
import { RecenterButton } from './RecenterButton';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  showRecenter: boolean;
  isRecentering?: boolean;
  style?: ViewStyle;
}

export const MapControls: FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  showRecenter,
  isRecentering = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <RecenterButton
        visible={showRecenter}
        onRecenter={onRecenter}
        isLoading={isRecentering}
      />
      <View style={styles.spacer} />
      <ZoomControl onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  spacer: {
    height: 12,
  },
});
