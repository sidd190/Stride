import React, { useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors, spacing, typography } from '@/constants/theme'
import { createPressAnimation } from '@/utils/animations'

interface AnimatedButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  style?: ViewStyle
  haptic?: boolean
}

export function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  haptic = true,
}: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current
  const pressAnimation = createPressAnimation(scale)

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress()
  }

  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ]

  const textStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
  ]

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={handlePress}
      {...pressAnimation}
    >
      <Animated.View style={[buttonStyle, { transform: [{ scale }] }]}>
        <Text style={textStyle}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  button_primary: {
    backgroundColor: colors.primary[500],
  },
  button_secondary: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  button_danger: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.error,
  },
  button_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  button_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  button_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  button_disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.label,
    letterSpacing: 2,
  },
  text_primary: {
    color: colors.background.primary,
  },
  text_secondary: {
    color: colors.text.primary,
  },
  text_ghost: {
    color: colors.text.tertiary,
  },
  text_danger: {
    color: colors.error,
  },
  text_sm: {
    fontSize: 12,
  },
  text_md: {
    fontSize: 14,
  },
  text_lg: {
    fontSize: 16,
  },
})
