import React from 'react'
import { Animated, StyleSheet, ViewStyle } from 'react-native'
import { useFadeIn, useSlideIn } from '@/utils/animations'
import { colors, spacing, borderRadius, shadows } from '@/constants/theme'

interface AnimatedCardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'glow'
  style?: ViewStyle
  delay?: number
  slideDirection?: 'left' | 'right' | 'up' | 'down'
}

export function AnimatedCard({
  children,
  variant = 'default',
  style,
  delay = 0,
  slideDirection = 'up',
}: AnimatedCardProps) {
  const opacity = useFadeIn(600, delay)
  const slideTransform = useSlideIn(slideDirection, 500, delay)

  const cardStyle = [
    styles.card,
    styles[`card_${variant}`],
    style,
  ]

  return (
    <Animated.View
      style={[
        cardStyle,
        {
          opacity,
          transform: slideTransform.transform,
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  card_default: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  card_elevated: {
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  card_outlined: {
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  card_glow: {
    ...shadows.glow,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
})
