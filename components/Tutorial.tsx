import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography } from '@/constants/theme'

const { width } = Dimensions.get('window')

interface TutorialSlide {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}

const slides: TutorialSlide[] = [
  {
    icon: 'wallet-outline',
    title: 'CONNECT',
    description: 'Link your Solana wallet to get started',
  },
  {
    icon: 'fitness-outline',
    title: 'RECORD',
    description: 'Track workouts and earn points',
  },
  {
    icon: 'flag-outline',
    title: 'RACE',
    description: 'Compete live with others',
  },
  {
    icon: 'trophy-outline',
    title: 'COMPETE',
    description: 'Join leagues and climb rankings',
  },
]

interface TutorialProps {
  onComplete: () => void
}

export function Tutorial({ onComplete }: TutorialProps) {
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / width)
    setCurrentIndex(index)
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      })
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>SKIP</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.iconContainer}>
              <Ionicons name={slide.icon} size={80} color={colors.primary[500]} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'START' : 'NEXT'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconContainer: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 6,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.default,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary[500],
  },
  nextButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
  },
  nextText: {
    ...typography.label,
    color: colors.background.primary,
    letterSpacing: 2,
  },
})
