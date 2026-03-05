import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

export const useAnimatedValue = (initialValue: number = 0) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current
  return animatedValue
}

export const useFadeIn = (duration: number = 600, delay: number = 0) => {
  const opacity = useAnimatedValue(0)

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start()
  }, [])

  return opacity
}

export const useSlideIn = (
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  duration: number = 500,
  delay: number = 0
) => {
  const distance = 50
  const initialValue =
    direction === 'left' ? -distance :
    direction === 'right' ? distance :
    direction === 'up' ? distance : -distance

  const translateValue = useAnimatedValue(initialValue)

  useEffect(() => {
    Animated.spring(translateValue, {
      toValue: 0,
      delay,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start()
  }, [])

  const transform =
    direction === 'left' || direction === 'right'
      ? [{ translateX: translateValue }]
      : [{ translateY: translateValue }]

  return { transform }
}

export const useScale = (duration: number = 300, delay: number = 0) => {
  const scale = useAnimatedValue(0.8)

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start()
  }, [])

  return { transform: [{ scale }] }
}

export const usePulse = (isActive: boolean) => {
  const scale = useAnimatedValue(1)

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start()
    } else {
      scale.setValue(1)
    }
  }, [isActive])

  return { transform: [{ scale }] }
}

export const createPressAnimation = (scale: Animated.Value) => {
  return {
    onPressIn: () => {
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }).start()
    },
    onPressOut: () => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }).start()
    },
  }
}

export const useShimmer = () => {
  const shimmerValue = useAnimatedValue(0)

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start()
  }, [])

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  })

  return { transform: [{ translateX }] }
}

export const staggerAnimation = (
  children: number,
  duration: number = 500,
  stagger: number = 100
) => {
  return Array.from({ length: children }).map((_, index) => ({
    delay: index * stagger,
    duration,
  }))
}
