import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing, typography } from '@/constants/theme'

interface BadgeProps {
  label: string
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'error' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  style?: ViewStyle
}

export function Badge({ label, variant = 'primary', size = 'md', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${size}`]]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  
  // Variants
  primary: {
    backgroundColor: colors.primary[600],
  },
  secondary: {
    backgroundColor: colors.secondary[600],
  },
  gold: {
    backgroundColor: colors.gold[500],
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  neutral: {
    backgroundColor: colors.dark[700],
  },
  
  // Sizes
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  size_lg: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  
  text: {
    color: colors.text.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
})
