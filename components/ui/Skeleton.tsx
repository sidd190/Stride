import React from 'react'
import { View, StyleSheet, Animated, ViewStyle } from 'react-native'
import { useShimmer } from '@/utils/animations'
import { colors, borderRadius } from '@/constants/theme'

interface SkeletonProps {
  width?: number | string
  height?: number
  style?: ViewStyle
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ width = '100%', height = 20, style, variant = 'rectangular' }: SkeletonProps) {
  const shimmerTransform = useShimmer()

  const skeletonStyle = [
    styles.skeleton,
    variant === 'circular' && styles.circular,
    variant === 'text' && styles.text,
    { width, height },
    style,
  ]

  return (
    <View style={skeletonStyle}>
      <Animated.View style={[styles.shimmer, shimmerTransform]} />
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  circular: {
    borderRadius: 9999,
  },
  text: {
    borderRadius: 4,
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
})
