import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, surfaces, borderRadius, shadows, spacing } from '@/constants/theme'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'glow'
  style?: ViewStyle
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: surfaces.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  default: {
    ...shadows.md,
  },
  elevated: {
    backgroundColor: surfaces.elevated2,
    ...shadows.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  glow: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    ...shadows.glow,
  },
})
